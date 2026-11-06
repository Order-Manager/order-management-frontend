"""Invoice PDFs for IFT Orders: upload, download and delete, for staff only.

Every request carries the user's Firebase ID token. The token is verified here, and every Firestore
read or write is then made *as that user* through the Firestore REST API, so the project's security
rules decide what they may see or change. No service account key is stored on the server.

Files live in DATA_DIR/<orderId>/<invoiceId>.pdf; each order lists its invoices in an `invoices`
array (id, name, size, uploadedAt, uploadedBy).
"""

import base64
import datetime
import json
import os
import re
import uuid
from pathlib import Path

import google.auth.transport.requests
import httpx
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from google.oauth2 import id_token as google_id_token

PROJECT = os.environ["FIREBASE_PROJECT_ID"]
DATA_DIR = Path(os.environ.get("DATA_DIR", "/data"))
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "20"))
MAX_FILES = 10

# Set when running against the local emulators (the Auth emulator issues unsigned tokens)
FIRESTORE_EMULATOR = os.environ.get("FIRESTORE_EMULATOR_HOST")
AUTH_EMULATOR = os.environ.get("FIREBASE_AUTH_EMULATOR_HOST")
FIRESTORE = f"http://{FIRESTORE_EMULATOR}/v1" if FIRESTORE_EMULATOR else "https://firestore.googleapis.com/v1"
DOCS = f"{FIRESTORE}/projects/{PROJECT}/databases/(default)/documents"

# Invoices only make sense once the order has been placed with the supplier
INVOICE_STATUSES = {"ordered", "received", "completed"}

# Same as isDevinci() in firestore.rules
DEVINCI = re.compile(r"[^@]+@(edu\.)?devinci\.fr", re.IGNORECASE)
ORDER_ID = re.compile(r"[A-Za-z0-9_-]{1,128}")
INVOICE_ID = re.compile(r"[0-9a-f]{32}")

app = FastAPI(title="orders-files", root_path=os.environ.get("ROOT_PATH", ""))

# Only needed locally, where the app and this service run on different ports
cors_origins = [origin for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization"],
        expose_headers=["Content-Disposition"],
    )

_google_request = google.auth.transport.requests.Request()


def verify(authorization: str | None) -> tuple[dict, str]:
    """Return the token's claims and the raw token, or refuse the request."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in first.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        if AUTH_EMULATOR:
            payload = token.split(".")[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            if claims.get("aud") != PROJECT:
                raise ValueError("token for another project")
        else:
            claims = google_id_token.verify_firebase_token(token, _google_request, audience=PROJECT)
    except Exception:
        raise HTTPException(401, "Your session has expired; sign in again.")
    if not claims.get("email_verified") or not DEVINCI.fullmatch(claims.get("email", "")):
        raise HTTPException(403, "Only verified Devinci accounts can use invoices.")
    return claims, token


def firestore(method: str, url: str, token: str, **kwargs) -> httpx.Response:
    return httpx.request(method, url, headers={"Authorization": f"Bearer {token}"}, timeout=15, **kwargs)


def require_admin(claims: dict, token: str) -> None:
    # The rules only let users read their own admin document, and only admins have one
    response = firestore("GET", f"{DOCS}/admins/{claims['sub']}", token)
    if response.status_code != 200:
        raise HTTPException(403, "Only research engineers can manage invoices.")


def get_order(order_id: str, token: str) -> dict:
    if not ORDER_ID.fullmatch(order_id):
        raise HTTPException(404, "Order not found.")
    response = firestore("GET", f"{DOCS}/orders/{order_id}", token)
    if response.status_code in (403, 404):
        raise HTTPException(404, "Order not found.")
    if response.status_code != 200:
        raise HTTPException(502, "Could not read the order.")
    return response.json()


def raw_invoices(order: dict) -> list[dict]:
    return order.get("fields", {}).get("invoices", {}).get("arrayValue", {}).get("values", [])


def find_invoice(order: dict, invoice_id: str) -> dict | None:
    if not INVOICE_ID.fullmatch(invoice_id):
        return None
    for value in raw_invoices(order):
        if value["mapValue"]["fields"]["id"]["stringValue"] == invoice_id:
            return value
    return None


def clean_name(filename: str | None) -> str:
    name = Path(filename or "invoice.pdf").name
    name = re.sub(r"[\x00-\x1f\x7f/\\]", "", name).strip() or "invoice.pdf"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    return name[-120:]


def commit_transform(document: str, token: str, transform: dict) -> None:
    body = {"writes": [{"transform": {"document": document, "fieldTransforms": [transform]}}]}
    response = firestore("POST", f"{DOCS}:commit", token, json=body)
    if response.status_code != 200:
        raise HTTPException(502, "Could not update the order's invoice list.")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/orders/{order_id}/invoices")
def upload(order_id: str, files: list[UploadFile] = File(...), authorization: str | None = Header(None)) -> dict:
    claims, token = verify(authorization)
    require_admin(claims, token)
    order = get_order(order_id, token)
    if order["fields"].get("status", {}).get("stringValue") not in INVOICE_STATUSES:
        raise HTTPException(409, "Invoices can be added once the order has been placed.")
    if not files or len(files) > MAX_FILES:
        raise HTTPException(400, f"Upload between 1 and {MAX_FILES} files at a time.")

    folder = DATA_DIR / order_id
    folder.mkdir(parents=True, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    saved, entries = [], []
    try:
        for upload_file in files:
            data = upload_file.file.read(MAX_UPLOAD_MB * 1024 * 1024 + 1)
            name = clean_name(upload_file.filename)
            if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
                raise HTTPException(413, f"{name} is larger than {MAX_UPLOAD_MB} MB.")
            # Checked on the content, not on the file name
            if not data.startswith(b"%PDF-"):
                raise HTTPException(415, f"{name} is not a PDF.")
            invoice_id = uuid.uuid4().hex
            path = folder / f"{invoice_id}.pdf"
            temporary = path.with_suffix(".part")
            temporary.write_bytes(data)
            temporary.replace(path)
            saved.append(path)
            entries.append({"mapValue": {"fields": {
                "id": {"stringValue": invoice_id},
                "name": {"stringValue": name},
                "size": {"integerValue": str(len(data))},
                "uploadedAt": {"timestampValue": now},
                "uploadedBy": {"stringValue": claims["email"]},
            }}})
        commit_transform(order["name"], token, {"fieldPath": "invoices", "appendMissingElements": {"values": entries}})
    except BaseException:
        # Never leave files on disk that the order doesn't list
        for path in saved:
            path.unlink(missing_ok=True)
        raise
    return {"uploaded": [entry["mapValue"]["fields"]["id"]["stringValue"] for entry in entries]}


@app.get("/orders/{order_id}/invoices/{invoice_id}")
def download(order_id: str, invoice_id: str, authorization: str | None = Header(None)) -> FileResponse:
    claims, token = verify(authorization)
    require_admin(claims, token)
    invoice = find_invoice(get_order(order_id, token), invoice_id)
    path = DATA_DIR / order_id / f"{invoice_id}.pdf"
    if invoice is None or not path.is_file():
        raise HTTPException(404, "Invoice not found.")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=invoice["mapValue"]["fields"]["name"]["stringValue"],
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@app.delete("/orders/{order_id}/invoices/{invoice_id}")
def delete(order_id: str, invoice_id: str, authorization: str | None = Header(None)) -> dict:
    claims, token = verify(authorization)
    require_admin(claims, token)
    order = get_order(order_id, token)
    invoice = find_invoice(order, invoice_id)
    if invoice is None:
        raise HTTPException(404, "Invoice not found.")
    commit_transform(order["name"], token, {"fieldPath": "invoices", "removeAllFromArray": {"values": [invoice]}})
    (DATA_DIR / order_id / f"{invoice_id}.pdf").unlink(missing_ok=True)
    return {"deleted": invoice_id}
