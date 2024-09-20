# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import firestore_fn, https_fn

# The Firebase Admin SDK to access Cloud Firestore.
from firebase_admin import initialize_app, firestore
import datetime
import google.cloud.firestore

# import logging

# logger = logging.getLogger('cloudfunctions.googleapis.com%2Fcloud-functions')
# logger.setLevel(logging.INFO)
# logger.addHandler(logging.StreamHandler())

app = initialize_app()


@firestore_fn.on_document_created(document="orders/{orderId}")
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

    event.data.reference.update({"updates": updates})


# Update lastUpdate field on order update
@firestore_fn.on_document_updated(document="orders/{orderId}")
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
            "author": after.get("requestedBy")
        }

        current_updates.append(update)

        event.data.after.reference.update({
            "updates": current_updates,
            "lastUpdate": datetime.datetime.now()
        })

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

            if after.get("requiresReviewPI"):
                status = "pendingPI"

                update = {
                    "type": "review-pi-requested",
                    "date": datetime.datetime.now(),
                    "author": after.get("reviewIRBy")
                }

                current_updates.append(update)

            else:
                status = "processingOrder"


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

            event.data.after.reference.update({
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })

        elif after.get("status") == "approvedPI":

            update = {
                "type": "review-pi-approved",
                "date": datetime.datetime.now(),
                "author": after.get("reviewPIBy")
            }

            current_updates.append(update)

            event.data.after.reference.update({
                "status": "processingOrder",
                "updates": current_updates,
                "lastUpdate": datetime.datetime.now()
            })


        elif after.get("status") == "refusedPI":
            update = {
                "type": "review-pi-refused",
                "date": datetime.datetime.now(),
                "author": after.get("reviewPIBy")
            }

            current_updates.append(update)

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

    if event.data.before.get("lastUpdate") == event.data.after.get("lastUpdate"):
        event.data.after.reference.update({"lastUpdate": datetime.datetime.now()})
