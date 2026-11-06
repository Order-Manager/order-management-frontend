# Runs against the local emulators (npm run emulators in the repo root), with the real Firestore rules:
#   cd services/orders-files && uv run pytest

import os
import uuid

import httpx
import pytest

PROJECT = "demo-orders"
FIRESTORE_HOST = "127.0.0.1:8080"
AUTH_HOST = "127.0.0.1:9099"

os.environ.update({
    "FIREBASE_PROJECT_ID": PROJECT,
    "FIRESTORE_EMULATOR_HOST": FIRESTORE_HOST,
    "FIREBASE_AUTH_EMULATOR_HOST": AUTH_HOST,
    "MAX_UPLOAD_MB": "1",
})

DOCS = f"http://{FIRESTORE_HOST}/v1/projects/{PROJECT}/databases/(default)/documents"
AUTH = f"http://{AUTH_HOST}/identitytoolkit.googleapis.com/v1"
OWNER = {"Authorization": "Bearer owner"}
PDF = b"%PDF-1.4\n% test invoice\n%%EOF\n"


def make_user(email: str) -> tuple[str, str]:
    """Create a verified emulator user and return (uid, id token)."""
    password = "test-password"
    created = httpx.post(f"{AUTH}/accounts:signUp?key=fake", json={"email": email, "password": password}).json()
    httpx.post(f"{AUTH}/projects/{PROJECT}/accounts:update", headers=OWNER,
               json={"localId": created["localId"], "emailVerified": True}).raise_for_status()
    signed_in = httpx.post(f"{AUTH}/accounts:signInWithPassword?key=fake",
                           json={"email": email, "password": password, "returnSecureToken": True}).json()
    return created["localId"], signed_in["idToken"]


def set_doc(path: str, fields: dict) -> None:
    httpx.patch(f"{DOCS}/{path}", headers=OWNER, json={"fields": fields}).raise_for_status()


def get_doc(path: str) -> dict:
    return httpx.get(f"{DOCS}/{path}", headers=OWNER).json()


def string(value: str) -> dict:
    return {"stringValue": value}


@pytest.fixture(scope="module")
def setup(tmp_path_factory):
    os.environ["DATA_DIR"] = str(tmp_path_factory.mktemp("data"))
    from fastapi.testclient import TestClient
    from app.main import app

    suffix = uuid.uuid4().hex[:8]
    admin_uid, admin_token = make_user(f"pytest-admin-{suffix}@devinci.fr")
    student_uid, student_token = make_user(f"pytest-student-{suffix}@edu.devinci.fr")
    set_doc(f"admins/{admin_uid}", {"email": string(f"pytest-admin-{suffix}@devinci.fr"), "isIR": {"booleanValue": True}})

    orders = {}
    for status in ("ordered", "pendingIR"):
        order_id = f"pytest-{status}-{suffix}"
        set_doc(f"orders/{order_id}", {
            "title": string("pytest order"), "status": string(status), "archived": {"booleanValue": False},
            "requestedBy": string(f"pytest-student-{suffix}@edu.devinci.fr"), "requestedById": string(student_uid),
            "updates": {"arrayValue": {}}, "items": {"arrayValue": {}},
        })
        orders[status] = order_id

    yield {
        "client": TestClient(app),
        "admin": {"Authorization": f"Bearer {admin_token}"},
        "student": {"Authorization": f"Bearer {student_token}"},
        "orders": orders,
    }

    for order_id in orders.values():
        httpx.delete(f"{DOCS}/orders/{order_id}", headers=OWNER)
    httpx.delete(f"{DOCS}/admins/{admin_uid}", headers=OWNER)


def invoice_ids(order_id: str) -> list[str]:
    values = get_doc(f"orders/{order_id}")["fields"].get("invoices", {}).get("arrayValue", {}).get("values", [])
    return [value["mapValue"]["fields"]["id"]["stringValue"] for value in values]


def test_requires_sign_in(setup):
    response = setup["client"].post(f"/orders/{setup['orders']['ordered']}/invoices", files={"files": ("a.pdf", PDF)})
    assert response.status_code == 401


def test_staff_upload_download_delete(setup):
    client, order_id = setup["client"], setup["orders"]["ordered"]
    response = client.post(f"/orders/{order_id}/invoices", headers=setup["admin"],
                           files=[("files", ("RS invoice.pdf", PDF, "application/pdf")), ("files", ("second.pdf", PDF))])
    assert response.status_code == 200, response.text
    uploaded = response.json()["uploaded"]
    assert len(uploaded) == 2 and set(uploaded) <= set(invoice_ids(order_id))

    response = client.get(f"/orders/{order_id}/invoices/{uploaded[0]}", headers=setup["admin"])
    assert response.status_code == 200
    assert response.content == PDF
    assert "RS%20invoice.pdf" in response.headers["content-disposition"] or "RS invoice.pdf" in response.headers["content-disposition"]

    response = client.delete(f"/orders/{order_id}/invoices/{uploaded[0]}", headers=setup["admin"])
    assert response.status_code == 200
    assert uploaded[0] not in invoice_ids(order_id)
    assert client.get(f"/orders/{order_id}/invoices/{uploaded[0]}", headers=setup["admin"]).status_code == 404


def test_students_cannot_upload_or_download(setup):
    client, order_id = setup["client"], setup["orders"]["ordered"]
    assert client.post(f"/orders/{order_id}/invoices", headers=setup["student"],
                       files={"files": ("a.pdf", PDF)}).status_code == 403
    uploaded = client.post(f"/orders/{order_id}/invoices", headers=setup["admin"],
                           files={"files": ("a.pdf", PDF)}).json()["uploaded"]
    assert client.get(f"/orders/{order_id}/invoices/{uploaded[0]}", headers=setup["student"]).status_code == 403
    assert client.delete(f"/orders/{order_id}/invoices/{uploaded[0]}", headers=setup["student"]).status_code == 403


def test_rejects_non_pdf_and_oversized_files_without_leaving_files(setup):
    client, order_id = setup["client"], setup["orders"]["ordered"]
    before = invoice_ids(order_id)
    files_before = set(os.listdir(os.path.join(os.environ["DATA_DIR"], order_id)))
    response = client.post(f"/orders/{order_id}/invoices", headers=setup["admin"],
                           files=[("files", ("ok.pdf", PDF)), ("files", ("photo.pdf", b"\x89PNG not a pdf"))])
    assert response.status_code == 415
    response = client.post(f"/orders/{order_id}/invoices", headers=setup["admin"],
                           files={"files": ("big.pdf", PDF + b"0" * (1024 * 1024))})
    assert response.status_code == 413
    assert invoice_ids(order_id) == before
    assert set(os.listdir(os.path.join(os.environ["DATA_DIR"], order_id))) == files_before


def test_only_once_ordered(setup):
    response = setup["client"].post(f"/orders/{setup['orders']['pendingIR']}/invoices", headers=setup["admin"],
                                    files={"files": ("a.pdf", PDF)})
    assert response.status_code == 409


def test_unknown_order_and_bad_ids(setup):
    client = setup["client"]
    assert client.post("/orders/does-not-exist/invoices", headers=setup["admin"],
                       files={"files": ("a.pdf", PDF)}).status_code == 404
    assert client.get(f"/orders/{setup['orders']['ordered']}/invoices/../../etc", headers=setup["admin"]).status_code == 404
