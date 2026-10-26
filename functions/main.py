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

        current_updates = before.get("updates")
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
                message=f"Your order '{escape(str(after.get('title')))}' has been rejected by {escape(str(after.get('reviewIRBy')))}. Please contact the Research Engineer for more information."
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
