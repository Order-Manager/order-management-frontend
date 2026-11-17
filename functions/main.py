# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import firestore_fn, https_fn

# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app, firestore, messaging
import datetime
import os
from html import escape
import google.cloud.firestore

# Set per project in functions/.env.<projectId>
APP_URL = os.environ.get("APP_URL", "https://ift.devinci.fr/orders")

# Where the prod functions have always run; changing it means deleting the old ones
REGION = "us-central1"

# import logging

# logger = logging.getLogger('cloudfunctions.googleapis.com%2Fcloud-functions')
# logger.setLevel(logging.INFO)
# logger.addHandler(logging.StreamHandler())

app = initialize_app()


@firestore_fn.on_document_created(document="orders/{orderId}", region=REGION)
def addUpdatesOnCreation(event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None]) -> None:
    """"""

    if event.data is None or event.data.get("requestedBy") is None:
        return

    updates = [
        {
            "type": "order-creation",
            "date": datetime.datetime.now(),
            "author": "system",
        }
    ]

    comment = event.data.get("comment")
    if comment:
        updates.append({
            "type": "comment",
            "date": datetime.datetime.now() + datetime.timedelta(seconds=3),
            "author": event.data.get("requestedBy"),
            "message": comment,
        })

    # Every order carries "archived" so the lists can filter on it in the query
    event.data.reference.update({"updates": updates, "archived": False})

    if event.data.get("status") == "pendingIR":
        notifyReferent(event.data.to_dict(), event.data.id)


# Tells the referent named on an order that it is waiting for review
def notifyReferent(order: dict, order_id: str) -> None:
    referent = order.get("referent")
    if not referent:
        return
    sendEmail(
        to=referent,
        subject="New order to review",
        message=f"{escape(str(order.get('requestedBy')))} submitted the order '{escape(str(order.get('title')))}' and named you as their referent. Please review it <a href='{APP_URL}/#/view/{escape(str(order_id))}'>here</a>."
    )


@firestore_fn.on_document_updated(document="orders/{orderId}", region=REGION)
def updateLastUpdate(event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None]) -> None:
    """"""

    if event.data is None:
        return

    before = event.data.before.to_dict()
    after = event.data.after.to_dict()

    if before.get("items") != after.get("items"):
        current_updates = before.get("updates")

        update = {
            "type": "order-items-updated",
            "date": datetime.datetime.now(),
            "author": after.get("lastItemsUpdatedBy")
        }

        current_updates.append(update)

        event.data.after.reference.update({
            "updates": current_updates,
            "lastUpdate": datetime.datetime.now()
        })


    if before.get("updates") != after.get("updates"):
        last_update = after.get("updates")[-1]
        if last_update.get("type") == "comment":
            if last_update.get("author") != after.get("requestedBy") and last_update.get("message") != "" and last_update.get("message") is not None and last_update.get("author") is not None:
                sendEmail(
                    to=after.get("requestedBy"),
                    subject="New comment on your order",
                    message=f"New comment from {escape(str(last_update.get('author')))}: {escape(str(last_update.get('message')))}"
                )


    if before.get("lastReviewRequestDate") != after.get("lastReviewRequestDate"):
        current_updates = before.get("updates")

        update = {
            "type": "review-requested",
            "date": datetime.datetime.now(),
            "author": after.get("lastReviewRequestBy"),
            "message": after.get("lastReviewRequestTo")
        }

        current_updates.append(update)

        event.data.after.reference.update({
            "updates": current_updates,
            "lastUpdate": datetime.datetime.now()
        })

        sendEmail(
            to=after.get("lastReviewRequestTo"),
            subject="New order review request",
            message=f"You have been requested to review the order '{escape(str(after.get('title')))}' by {escape(str(after.get('lastReviewRequestBy')))}. Please check it out <a href='{APP_URL}/#/view/{escape(str(event.data.after.id))}'>here</a>."
        )

    if before.get("status") != after.get("status"):

        # A draft submitted for review
        if before.get("status") == "draft" and after.get("status") == "pendingIR":
            notifyReferent(after, event.data.after.id)

        current_updates = before.get("updates")
        order_link = f"<a href='{APP_URL}/#/view/{escape(str(event.data.after.id))}'>here</a>"

        # The referent asked for changes: their message goes in the history as a comment, in one email
        if after.get("status") == "changesRequested":
            referent = after.get("changesRequestedBy")
            message = after.get("changesRequestedMessage") or ""
            now = datetime.datetime.now()
            current_updates.append({"type": "comment", "date": now, "author": referent, "message": message})
            current_updates.append({"type": "changes-requested", "date": now, "author": referent})
            event.data.after.reference.update({"updates": current_updates, "lastUpdate": now})
            sendEmail(
                to=after.get("requestedBy"),
                subject="Changes requested on your order",
                message=f"{escape(str(referent))} asked for changes to your order '{escape(str(after.get('title')))}':<br><br>{escape(message)}<br><br>Update your order and send it back for review {order_link}."
            )

        # The student made the changes and sent the order back, with a reply
        elif before.get("status") == "changesRequested" and after.get("status") == "pendingIR":
            student = after.get("requestedBy")
            message = after.get("sentBackMessage") or ""
            now = datetime.datetime.now()
            current_updates.append({"type": "comment", "date": now, "author": student, "message": message})
            current_updates.append({"type": "sent-back", "date": now, "author": student})
            event.data.after.reference.update({"updates": current_updates, "lastUpdate": now})
            sendEmail(
                to=after.get("changesRequestedBy") or after.get("referent"),
                subject="Order sent back for review",
                message=f"{escape(str(student))} updated the order '{escape(str(after.get('title')))}' and sent it back for review:<br><br>{escape(message)}<br><br>Review it {order_link}."
            )

        if after.get("status") == "cancelled":

            update = {
                "type": "order-cancelled",
                "date": datetime.datetime.now(),
                "author": after.get("cancelledBy")
            }

            current_updates.append(update)

            event.data.after.reference.update({
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

        if after.get("status") == "approvedIR":

            update = {
                "type": "review-ir-approved",
                "date": datetime.datetime.now(),
                "author": after.get("reviewIRBy")
            }

            current_updates.append(update)

            status = "processingOrder"

            sendEmail(
                to=after.get("requestedBy"),
                subject="Your order has been approved",
                message=f"Your order '{escape(str(after.get('title')))}' has been approved by {escape(str(after.get('reviewIRBy')))}. It will be processed shortly."
            )

            event.data.after.reference.update({
                "status": status,
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

        elif after.get("status") == "refusedIR":

            update = {
                "type": "review-ir-refused",
                "date": datetime.datetime.now(),
                "author": after.get("reviewIRBy")
            }

            current_updates.append(update)

            sendEmail(
                to=after.get("requestedBy"),
                subject="Your order has been rejected",
                message=f"Your order '{escape(str(after.get('title')))}' has been rejected by {escape(str(after.get('reviewIRBy')))}. Please contact your referent for more information."
            )

            event.data.after.reference.update({
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

        elif after.get("status") == "ordered":

            update = {
                "type": "order-processed",
                "date": datetime.datetime.now(),
                "author": after.get("orderedBy")
            }

            current_updates.append(update)

            sendEmail(
                to=after.get("requestedBy"),
                subject="Your items have been ordered",
                message=f"Your order '{escape(str(after.get('title')))}' has been processed by {escape(str(after.get('orderedBy')))}. You will be notified when it is ready for pickup."
            )

            event.data.after.reference.update({
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

        elif after.get("status") == "received":

            update = {
                "type": "order-received",
                "date": datetime.datetime.now(),
                "author": after.get("receivedBy")
            }

            current_updates.append(update)

            sendEmail(
                to=after.get("requestedBy"),
                subject="Your order has been received",
                message=f"Your order '{escape(str(after.get('title')))}' has been received by {escape(str(after.get('receivedBy')))}. Please pick it up at your convenience."
            )

            event.data.after.reference.update({
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

        elif after.get("status") == "canceled":

            update = {
                "type": "order-canceled",
                "date": datetime.datetime.now(),
                "author": after.get("canceledBy")
            }

            current_updates.append(update)

            event.data.after.reference.update({
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

            sendEmail(
                to=after.get("requestedBy"),
                subject="Your order has been canceled",
                message=f"Your order '{escape(str(after.get('title')))}' has been canceled by {escape(str(after.get('canceledBy')))}."
            )


        elif after.get("status") == "completed":

            update = {
                "type": "order-completed",
                "date": datetime.datetime.now(),
                "author": after.get("completedBy")
            }

            current_updates.append(update)

            event.data.after.reference.update({
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

            sendEmail(
                to=after.get("requestedBy"),
                subject="Your order has been completed",
                message=f"Your order '{escape(str(after.get('title')))}' has been completed by {escape(str(after.get('completedBy')))}."
            )

    if event.data.before.get("lastUpdate") == event.data.after.get("lastUpdate"):
        event.data.after.reference.update({"lastUpdate": datetime.datetime.now()})


# Helper function to send emails using the Firebase Trigger Email extension
def sendEmail(to: str, subject: str, message: str) -> None:
    if not to or not subject or not message:
        return
    try:
        db = firestore.client()

        email_ref = db.collection("mail").document()
        email_ref.set({
            "to": [to],
            "message": {
                "subject": "[ift-orders] " + subject,
                "html": message
            }
        })
    except Exception as e:
        print(f"Failed to send email: {e}")


# Dev only: lets the people in ACCOUNT_SWITCHERS sign in as test accounts and back, without email links.
# Only defined where functions/.env.<project> sets ACCOUNT_SWITCHERS, so it never exists on prod.
ACCOUNT_SWITCHERS = {e.strip().lower() for e in os.environ.get("ACCOUNT_SWITCHERS", "").split(",") if e.strip()}

# Test accounts, created by `node scripts/seed-dev.mjs --personas`
PERSONAS = {
    "student": "persona-student",
    "referent": "persona-referent",
    "admin": "persona-admin",
}

if ACCOUNT_SWITCHERS:
    from firebase_admin import auth as admin_auth

    @https_fn.on_call(region=REGION)
    def switchAccount(req: https_fn.CallableRequest) -> dict:
        if req.auth is None:
            raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Sign in first.")
        claims = req.auth.token
        email = str(claims.get("email", "")).lower()
        if email in ACCOUNT_SWITCHERS and claims.get("email_verified") is True:
            # Signed in as themselves: remember who to switch back to
            home = req.auth.uid
        elif isinstance(claims.get("switcherHome"), str) and req.auth.uid in [*PERSONAS.values(), claims["switcherHome"]]:
            # Already switched by this function: the claim can only come from a token it minted
            home = claims["switcherHome"]
        else:
            raise https_fn.HttpsError(https_fn.FunctionsErrorCode.PERMISSION_DENIED, "Not allowed to switch accounts.")

        account = (req.data or {}).get("account")
        if account == "home":
            uid = home
        elif account in PERSONAS:
            uid = PERSONAS[account]
        else:
            raise https_fn.HttpsError(https_fn.FunctionsErrorCode.INVALID_ARGUMENT, "Unknown account.")

        token = admin_auth.create_custom_token(uid, {"switcherHome": home})
        return {"token": token.decode() if isinstance(token, bytes) else token}
