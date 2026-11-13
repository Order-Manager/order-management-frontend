<script>
import { computed, ref } from "vue";

import { useDocument, useFirestore, useCurrentUser, useCollection } from 'vuefire'
import { doc, updateDoc, collection, arrayUnion, Timestamp, serverTimestamp } from "firebase/firestore";


import { useRoute } from 'vue-router'

import { updateTypesToMessage, statusTypesToMessage, statusTypesToColor, updateTypesToColor, updateTypesToIcon, priorityToColor, MIN_JUSTIFICATION, JUSTIFICATION_PLACEHOLDER } from '../utils/definitions.js'

import { useToast } from "vue-toastification";

import StatusBadge from '../components/StatusBadge.vue'
import RelativeTime from '../components/RelativeTime.vue'
import OrderProgress from '../components/OrderProgress.vue'
import InvoicesPanel from '../components/InvoicesPanel.vue'
import StockBadge from '../components/StockBadge.vue'
import { STOCK_LEVELS, normalizeLink, partsByLink } from '../utils/catalog.js'
import { formatEuros, orderTotal, itemTotal } from '../utils/dates.js'
import { displayName } from '../utils/people.js'


export default {
    components: {
        StatusBadge, RelativeTime, OrderProgress, InvoicesPanel, StockBadge
    },
    methods: {
        // The lab's stock of the catalogue part with this item's link, if there is one
        stockFor(item) {
            const part = this.catalogByLink.get(normalizeLink(item.link));
            return part && !part.hidden ? part.stock : undefined;
        },
        goToOrder(date) {
            this.$router.push(`/view/${date}`)
        },
        async confirmCancel() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            this.busy = true
            try {
                await updateDoc(orderRef, {
                    "status": "cancelled",
                    "cancelledBy": this.currentUser.email
                })
                this.$refs.cancelDialog.close()
                this.showSuccess("Order cancelled.")
            } catch (error) {
                this.showError("Could not cancel the order: " + error.message)
            } finally {
                this.busy = false
            }
        },
        openRejectDialog() {
            this.rejectReason = ""
            this.rejectError = ""
            this.$refs.rejectDialog.showModal()
        },
        // The reason goes in as a comment first, so the student gets it by email,
        // then the status changes in a separate write (one combined write would lose the comment)
        async confirmReject() {
            const reason = this.rejectReason.trim()
            if (!reason) {
                this.rejectError = "Please give a reason: the student will receive it by email."
                this.$refs.rejectReason.focus()
                return
            }
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            this.busy = true
            try {
                await updateDoc(orderRef, {
                    "updates": arrayUnion({
                        "type": "comment",
                        "date": new Date(),
                        "author": this.currentUser.email,
                        "message": reason
                    })
                })
                await updateDoc(orderRef, {
                    "status": "refusedIR",
                    "reviewIR": false,
                    "reviewIRBy": this.currentUser.email,
                })
                this.$refs.rejectDialog.close()
                this.showSuccess(`Order rejected. ${this.order.requestedBy} will get your reason by email.`)
            } catch (error) {
                this.showError("Could not reject the order: " + error.message)
            } finally {
                this.busy = false
            }
        },
        // Ticket-style loop: the referent asks for changes, the student makes them and sends the order back.
        // The message travels with the status change; the update function puts it in the history and emails it.
        openChangesDialog() {
            this.changesMessage = ""
            this.changesError = ""
            this.$refs.changesDialog.showModal()
        },
        async confirmRequestChanges() {
            const message = this.changesMessage.trim()
            if (!message) {
                this.changesError = "Say what needs to change: the student will receive it by email."
                this.$refs.changesMessage.focus()
                return
            }
            this.busy = true
            try {
                await updateDoc(doc(useFirestore(), 'orders', this.order_id), {
                    "status": "changesRequested",
                    "changesRequestedBy": this.currentUser.email,
                    "changesRequestedMessage": message,
                    "changesRequestedAt": new Date(),
                })
                this.$refs.changesDialog.close()
                this.showSuccess(`Changes requested. ${this.order.requestedBy} will get your message by email.`)
            } catch (error) {
                this.showError("Could not request changes: " + error.message)
            } finally {
                this.busy = false
            }
        },
        openSendBackDialog() {
            if (this.editingItems) {
                this.showWarning("Save your item changes first.")
                return
            }
            this.sendBackMessage = ""
            this.sendBackError = ""
            this.$refs.sendBackDialog.showModal()
        },
        async confirmSendBack() {
            const message = this.sendBackMessage.trim()
            if (!message) {
                this.sendBackError = "Say what you changed, so the referent knows what to look at."
                this.$refs.sendBackMessage.focus()
                return
            }
            this.busy = true
            try {
                await updateDoc(doc(useFirestore(), 'orders', this.order_id), {
                    "status": "pendingIR",
                    "sentBackMessage": message,
                    "sentBackAt": serverTimestamp(),
                })
                this.$refs.sendBackDialog.close()
                this.showSuccess("Sent back for review. Your referent will get an email.")
            } catch (error) {
                this.showError("Could not send the order back: " + error.message)
            } finally {
                this.busy = false
            }
        },
        // While editing, a rejected item can be put back as it is; the referent sees it on the next review
        putBack(item) {
            delete item.rejected
            delete item.rejectedReason
            delete item.rejectedBy
            delete item.rejectedAt
        },
        // Referents can turn down single items while the order hasn't been placed yet
        canRejectItems() {
            return this.isReviewer() && !this.editingItems && ['pendingIR', 'processingOrder'].includes(this.order.status)
        },
        openRejectItemDialog(index) {
            const kept = this.order.items.filter(item => !item.rejected).length
            if (kept <= 1) {
                this.showWarning("This is the last item left: reject the whole order instead.")
                return
            }
            this.rejectItemIndex = index
            this.rejectItemReason = ""
            this.rejectItemError = ""
            this.$refs.rejectItemDialog.showModal()
        },
        // Same order of writes as rejecting the order: the comment (which emails the student), then the items
        async confirmRejectItem() {
            const reason = this.rejectItemReason.trim()
            if (!reason) {
                this.rejectItemError = "Please give a reason: the student will receive it by email."
                this.$refs.rejectItemReason.focus()
                return
            }
            const item = this.order.items[this.rejectItemIndex]
            this.busy = true
            try {
                await this.postItemComment(`Item rejected: “${item.name}”. ${reason}`)
                await this.writeItems(this.order.items.map((it, i) => i === this.rejectItemIndex
                    ? { ...it, rejected: true, rejectedReason: reason, rejectedBy: this.currentUser.email, rejectedAt: new Date() }
                    : it))
                this.$refs.rejectItemDialog.close()
                this.showSuccess(`Item rejected. ${this.order.requestedBy} will get your reason by email.`)
            } catch (error) {
                this.showError("Could not reject the item: " + error.message)
            } finally {
                this.busy = false
            }
        },
        async restoreItem(index) {
            const item = this.order.items[index]
            this.busy = true
            try {
                await this.postItemComment(`Item restored: “${item.name}” will be ordered after all.`)
                await this.writeItems(this.order.items.map((it, i) => {
                    if (i !== index) return it
                    const { rejected, rejectedReason, rejectedBy, rejectedAt, ...rest } = it
                    return rest
                }))
                this.showSuccess(`${item.name} restored.`)
            } catch (error) {
                this.showError("Could not restore the item: " + error.message)
            } finally {
                this.busy = false
            }
        },
        postItemComment(message) {
            return updateDoc(doc(useFirestore(), 'orders', this.order_id), {
                "updates": arrayUnion({ "type": "comment", "date": new Date(), "author": this.currentUser.email, "message": message })
            })
        },
        writeItems(items) {
            return updateDoc(doc(useFirestore(), 'orders', this.order_id), {
                items,
                "lastItemsUpdatedBy": this.currentUser.email,
                "ignoreItemsModification": true,
            })
        },
        // Archiving notifies nobody. lastUpdate moves by 1 ms so the update function, which stamps
        // "now" only when lastUpdate is unchanged, leaves the order's date as it was.
        async setArchived(archived) {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const previous = this.order.lastUpdate
            this.busy = true
            try {
                await updateDoc(orderRef, {
                    archived,
                    ...(archived ? { archivedAt: new Date(), archivedBy: this.currentUser.email } : {}),
                    lastUpdate: Timestamp.fromMillis(previous.toMillis() + 1),
                })
                this.showSuccess(archived ? "Order archived. It now only appears under Archived." : "Order restored to the main lists.")
            } catch (error) {
                this.showError("Could not change the archive state: " + error.message)
            } finally {
                this.busy = false
            }
        },
        nextStep() {
            const order = this.order
            const admin = this.isReviewer()
            switch (order.status) {
                case 'draft':
                    return this.isAuthor() ? "This is a draft. Submit it when it's ready for review." : "Draft: not submitted yet."
                case 'changesRequested':
                    return this.isAuthor()
                        ? "Your referent asked for changes. Edit your items if needed, then send the order back for review."
                        : "Waiting for the student to make the changes and send the order back."
                case 'pendingIR':
                    return admin ? "Review this order: approve it, reject it, or ask another referent." : "Waiting for a referent to review it."
                case 'approvedIR':
                case 'processingOrder':
                    return admin ? `Approved. Order it from ${order.supplier}, then mark it as ordered.` : `Approved. A referent will order it from ${order.supplier}.`
                case 'ordered':
                    return admin ? "Mark the items as delivered when they arrive." : `Ordered from ${order.supplier}. You'll get an email when it arrives.`
                case 'received':
                    return admin ? "Waiting for pick-up. Mark it as completed once it's collected." : "It has arrived: you can pick it up."
                case 'completed':
                    return "Picked up. This order is closed."
                case 'refusedIR':
                    return "Rejected. See the comments below for the reason."
                case 'cancelled':
                    return `Cancelled${order.cancelledBy ? ' by ' + order.cancelledBy : ''}.`
                default:
                    return ""
            }
        },
        isEnded() {
            return ['refusedIR', 'cancelled'].includes(this.order.status)
        },
        formatEuros, orderTotal, itemTotal, displayName,
        // Drafts can be saved without a full justification; ask for one before they go to review
        publishOrder() {
            if ((this.order.comment || "").trim().length >= MIN_JUSTIFICATION) {
                this.confirmPublish()
                return
            }
            this.justification = ""
            this.justificationError = ""
            this.$refs.justifyDialog.showModal()
        },
        async confirmPublish(justification) {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            this.busy = true
            try {
                // Posted as the student's own comment, so it shows in the history and emails nobody
                if (justification) {
                    await updateDoc(orderRef, {
                        "updates": arrayUnion({
                            "type": "comment",
                            "date": new Date(),
                            "author": this.currentUser.email,
                            "message": justification
                        })
                    })
                }
                await updateDoc(orderRef, { "status": "pendingIR" })
                if (this.$refs.justifyDialog.open) this.$refs.justifyDialog.close()
                this.showSuccess("Order submitted. A referent will review it.")
            } catch (error) {
                this.showError("Could not submit the order: " + error.message)
            } finally {
                this.busy = false
            }
        },
        submitJustification() {
            const text = this.justification.trim()
            if (text.length < MIN_JUSTIFICATION) {
                this.justificationError = `Explain why you need these parts: at least ${MIN_JUSTIFICATION} characters (${text.length} so far).`
                this.$refs.justification.focus()
                return
            }
            this.confirmPublish(text)
        },
        approvedByIR() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()

            updateDoc(orderRef, {
                "status": "approvedIR",
                "reviewIR": true,
                "reviewIRBy": currentUser.value.email,
            })
            // console.log(orderRef)
        },
        approvedByIR() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()

            updateDoc(orderRef, {
                "status": "approvedIR",
                "reviewIR": true,
                "reviewIRBy": currentUser.value.email,
            })
            // console.log(orderRef)
        },
        // The stage's own actions (shown as buttons) and the occasional ones (in the More menu)
        hasMainActions() {
            const status = this.order.status
            return (this.isAuthor() && ['draft', 'pendingIR', 'changesRequested'].includes(status))
                || (this.isReviewer() && ['pending', 'refused', 'pendingIR', 'refusedIR', 'processingOrder', 'ordered', 'received', 'changesRequested'].includes(status))
        },
        hasMoreActions() {
            return this.isReviewer()
        },
        canAskAnotherReferent() {
            return this.isReviewer() && ['pendingIR', 'refusedIR'].includes(this.order.status)
        },
        closeMore(returnFocus) {
            this.moreOpen = false
            if (returnFocus) this.$nextTick(() => this.$refs.moreButton?.focus())
        },
        // Close the menu when the keyboard moves focus out of it (Safari doesn't focus buttons on click, hence the relatedTarget check)
        onMoreFocusOut(event) {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) this.moreOpen = false
        },
        // ...and on a click or tap anywhere else
        onOutsidePointer(event) {
            if (!event.target.closest('.more-actions')) this.moreOpen = false
        },
        openReviewRequestDialog() {
            this.closeMore(false)
            this.selectedReviewer = ""
            this.$refs.reviewRequestDialog.showModal()
            this.$nextTick(() => this.$refs.reviewerSelect.focus())
        },
        sendReviewRequest() {
            if (!this.selectedReviewer) return
            this.requestReview()
            this.$refs.reviewRequestDialog.close()
        },
        requestReview() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            if (!this.selectedReviewer) {
                this.showError("Please select a reviewer");
                return;
            }
            const reviewRequests = this.order.reviewRequests || [];
            reviewRequests.push({
                reviewer: this.selectedReviewer,
                requestedBy: currentUser.value.email,
                date: new Date(),
            });

            updateDoc(orderRef, {
                "reviewRequests": reviewRequests,
                "lastReviewRequestBy": currentUser.value.email,
                "lastReviewRequestDate": new Date(),
                "lastReviewRequestTo": this.selectedReviewer,
            })
            this.showSuccess("Review request sent to " + this.selectedReviewer);
            // console.log(orderRef)
        },
        isReviewRequestAllowed(reviewRequestTo) {
            const reviewRequests = this.order.reviewRequests || [];
            if (reviewRequests.length === 0) return true;
            const lastRequest = reviewRequests.find(request => request.reviewer === reviewRequestTo);
            if (!lastRequest) return true;
            const currentDate = new Date();
            const requestDate = lastRequest.date.toDate();
            const diffTime = Math.abs(currentDate - requestDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 2; // 2 days expiration
        },
        setOrderStatus(status) {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()

            let update = {
                "status": status
            }
            update[`${status}By`] = currentUser.value.email

            updateDoc(orderRef, update)
        },
        addComment() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            const comment = this.newComment.trim()

            // TODO: Add rule checks
            if (comment.length == 0) {
                this.showError("Comment cannot be empty");
                return;
            }
            if (comment.length > 1000) {
                this.showError("Comment is too long");
                return;
            }
            updateDoc(orderRef, {
                "updates": arrayUnion({
                    "type": "comment",
                    "date": new Date(),
                    "author": currentUser.value.email,
                    "message": comment
                })
            })
            this.newComment = ""
        },
        showError(message) {
            this.toast.error(message);
        },
        showSuccess(message) {
            this.toast.success(message);
        },
        showWarning(message) {
            this.toast.warning(message);
        },
        showInfo(message) {
            this.toast.info(message);
        },
        tagName(id) {
            const tag = this.tags.find(t => t.id === id);
            return tag ? tag.name : id;
        },
        isReviewer() {
            return this.userData && this.userData.isIR;
        },
        isAuthor() {
            return this.order.requestedById === this.currentUser.uid;
        },
        canEdit() {
            return (
                this.isAuthor() && ["draft", "pendingIR", "changesRequested"].includes(this.order.status)
                || this.isReviewer()
            );
        },
        updateItemStatus(index, field, value) {
            this.order.items[index][field] = value;

            // Rejected items won't be bought, so they don't hold the order back
            if (this.order.status == "processingOrder" && this.order.items.every(item => item.rejected || item.ordered)) {
                this.setOrderStatus("ordered");
            }

            if (this.order.status == "ordered" && this.order.items.every(item => item.rejected || item.delivered)) {
                this.setOrderStatus("received");
            }

            if (this.order.status == "received" && this.order.items.every(item => item.rejected || item.completed)) {
                this.setOrderStatus("completed");
            }

            const db = useFirestore();
            const orderRef = doc(db, 'orders', this.order_id);
            updateDoc(orderRef, {
                items: this.order.items,
                "lastItemsUpdatedBy": this.currentUser.email,
                "ignoreItemsModification": true,
            });

        },
        toggleEditItems() {
            if (this.editingItems) {
                this.saveItems();
            } else{
                this.editingItems = true;
            }
        },
        saveItems() {
            try {
                const supplierUrl = this.supplierUrl.split("https://www.").slice(-1)[0].split("https://").slice(-1)[0];

                for (const item of this.order.items) {
                    if (!item.name) {
                        this.showError("Item name is required.");
                        return;
                    }

                    if (!item.link) {
                        this.showError("Item link is required.");
                        return;
                    }

                    const croppedLink = item.link.split("https://www.").slice(-1)[0].split("https://").slice(-1)[0];
                    if (!croppedLink.startsWith(supplierUrl)) {
                        this.showError(`The link of the item must start with the supplier's webpage ${supplierUrl} ${croppedLink}.`);
                        return;
                    }

                    if (item.quantity <= 0) {
                        this.showError("Quantity must be greater than 0.");
                        return;
                    }
                }

                const db = useFirestore();
                const orderRef = doc(db, 'orders', this.order_id);

                updateDoc(orderRef, {
                    items: this.order.items,
                    "lastItemsUpdatedBy": this.currentUser.email,
                    "ignoreItemsModification": false,
                });

                this.editingItems = false;
                this.showSuccess("Items updated!");
            } catch (error) {
                console.error("Error saving items:", error);
                this.showError("Failed to save items.");
            }
        },
        addItem() {
            this.order.items.push({
                name: '',
                link: '',
                quantity: 1,
                price: 0.00
            });
        },
        deleteItem(index) {
            this.order.items.splice(index, 1);
            this.showInfo("Item removed.");
        },
        getItemNextStatus(item) {
            if (item.rejected) return "none";
            if (item.completed) return "none";
            if (this.order.status == "completed") return "none";
            if (item.delivered) return "completed";
            if (this.order.status == "received") return "completed";
            if (item.ordered) return "delivered";
            if (this.order.status == "ordered") return "delivered";
            if (this.order.status == "processingOrder") return "ordered";
            return "none";
        },
        getItemStatus(item) {
            if (item.rejected) return "rejected";
            if (item.completed) return "completed";
            if (this.order.status == "completed") return "completed";
            if (item.delivered) return "delivered";
            if (this.order.status == "received") return "delivered";
            if (item.ordered) return "ordered";
            if (this.order.status == "ordered") return "ordered";
            return "pending";
        },
        getItemStatusColor(item) {
            let status = this.getItemStatus(item);
            if (status == "rejected") return "red";
            if (status == "completed") return "green";
            if (status == "delivered") return "blue";
            if (status == "ordered") return "blue";
            if (status == "pending") return "blue";
            return "blue";

        },
        async copyItemToClipboard(item) {
            try {
                await navigator.clipboard.writeText(JSON.stringify(item));
                this.showSuccess("Item copied to clipboard!");
            } catch (e) {
                this.showError("Failed to copy item.");
            }
        },
        async pasteItemFromClipboard() {
            try {
                const text = await navigator.clipboard.readText();
                const item = JSON.parse(text);
                // Basic validation
                if (item && item.name && item.link && item.quantity && item.price !== undefined) {
                    this.order.items.push(item);
                    this.showSuccess("Item pasted!");
                } else {
                    this.showError("Clipboard does not contain a valid item.");
                }
            } catch (e) {
                this.showError("Failed to paste item.");
            }
        },
    },
    props: {
        order_id: String,
    },
    watch: {
        moreOpen(open) {
            document[open ? 'addEventListener' : 'removeEventListener']('pointerdown', this.onOutsidePointer)
        },
        "order.title": {
            handler(title) {
                if (this.order) document.title = `${title || 'Untitled order'} · IFT Orders`;
            },
            immediate: true,
        },
    },
    beforeUnmount() {
        document.removeEventListener('pointerdown', this.onOutsidePointer)
    },
    data() {
        return {
            editingItems: false, // Toggle for editing items
            newComment: "",
            rejectReason: "",
            justification: "",
            justificationError: "",
            rejectError: "",
            changesMessage: "",
            changesError: "",
            sendBackMessage: "",
            sendBackError: "",
            rejectItemIndex: -1,
            rejectItemReason: "",
            rejectItemError: "",
            busy: false,
            moreOpen: false, // Reviewers' "More" menu
        };
    },
    setup() {
        const db = useFirestore()
        const currentUser = useCurrentUser()
        const route = useRoute()
        const order_id = route.params.id
        const tags = useCollection(collection(db, 'tags'))
        const order = useDocument(doc(db, 'orders', order_id))
        const userData = useDocument(doc(db, 'admins', currentUser.value.uid))
        // Only admins are allowed to list the admins collection
        const reviewers = useCollection(computed(() =>
            userData.value && userData.value.isIR ? collection(db, 'admins') : null
        ))
        const toast = useToast()
        const suppliers = useCollection(collection(db, 'suppliers'))
        const supplierUrl = computed(() => {
            return suppliers.value.find(s => s.name === order.value.supplier).webpage;
        })
        const selectedReviewer = ref("");
        const catalog = useCollection(collection(db, 'catalog'))
        const catalogByLink = computed(() => partsByLink(catalog.value))
        // The stock levels shown in this order's items, explained under the table
        const stockLegend = computed(() => {
            const shown = new Set((order.value?.items || []).map(item => {
                const part = catalogByLink.value.get(normalizeLink(item.link));
                return part && !part.hidden ? part.stock : undefined;
            }))
            return Object.entries(STOCK_LEVELS).filter(([key]) => shown.has(key)).map(([key, level]) => ({ key, ...level }))
        })

        return {
            MIN_JUSTIFICATION, JUSTIFICATION_PLACEHOLDER,
            order, order_id, updateTypesToMessage, statusTypesToMessage, userData, statusTypesToColor, updateTypesToColor, updateTypesToIcon, priorityToColor, tags, currentUser, toast, supplierUrl, reviewers, selectedReviewer, catalogByLink, stockLegend
        }
    }
}
</script>

<template>
    <div v-if="order">
        <section class="order-summary" aria-labelledby="order-title">
            <div class="summary-top">
                <div>
                    <h1 id="order-title">{{ order.title || '(Untitled order)' }}</h1>
                    <p class="summary-meta">Requested by {{ order.requestedBy }} · <RelativeTime :value="order.creationDate" /></p>
                </div>
                <StatusBadge :status="order.status" />
            </div>
            <OrderProgress v-if="!isEnded()" :status="order.status" />
            <p class="next-step" :class="{ ended: isEnded() }">
                <span class="material-symbols-outlined" aria-hidden="true">{{ isEnded() ? 'info' : 'arrow_forward' }}</span>
                {{ nextStep() }}
            </p>
            <div v-if="order.status === 'changesRequested' && order.changesRequestedMessage" class="changes-note">
                <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
                <div>
                    <p class="changes-note-title">{{ displayName(order.changesRequestedBy) }} asked for changes <RelativeTime v-if="order.changesRequestedAt" :value="order.changesRequestedAt" /></p>
                    <p class="changes-note-message">{{ order.changesRequestedMessage }}</p>
                </div>
            </div>
            <p v-if="order.archived" class="archived-note">
                <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
                <span>{{ order.archivedAt ? 'Archived ' : 'Archived' }}<RelativeTime v-if="order.archivedAt" :value="order.archivedAt" />. It only appears under Archived in the order list.</span>
            </p>
            <!-- What can be done next: the stage's main action first, then the occasional ones, then More -->
            <div v-if="hasMainActions() || hasMoreActions()" class="order-actions" role="group" aria-label="Order actions">
                <div class="order-actions-main">
                    <button v-if="isAuthor() && order.status === 'draft'" type="button" class="primary" :disabled="busy" @click="publishOrder()">
                        <span class="material-symbols-outlined" aria-hidden="true">send</span>Submit order
                    </button>
                    <button v-if="isAuthor() && order.status === 'changesRequested'" type="button" class="primary" :disabled="busy" @click="openSendBackDialog()">
                        <span class="material-symbols-outlined" aria-hidden="true">reply</span>Send back for review
                    </button>
                    <button v-if="isReviewer() && ['pending', 'refused', 'pendingIR', 'refusedIR'].includes(order.status)" type="button" class="primary" :disabled="busy" @click="approvedByIR(false)">
                        <span class="material-symbols-outlined" aria-hidden="true">check</span>Approve order
                    </button>
                    <button v-if="isReviewer() && order.status === 'processingOrder'" type="button" class="primary" :disabled="busy" @click="setOrderStatus('ordered')">
                        <span class="material-symbols-outlined" aria-hidden="true">shopping_cart_checkout</span>Mark as ordered
                    </button>
                    <button v-if="isReviewer() && order.status === 'ordered'" type="button" class="primary" :disabled="busy" @click="setOrderStatus('received')">
                        <span class="material-symbols-outlined" aria-hidden="true">inventory</span>Mark as delivered
                    </button>
                    <button v-if="isReviewer() && order.status === 'received'" type="button" class="primary" :disabled="busy" @click="setOrderStatus('completed')">
                        <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>Mark as completed
                    </button>
                    <button v-if="isReviewer() && ['pendingIR', 'processingOrder'].includes(order.status)" type="button" :disabled="busy" @click="openChangesDialog()">
                        <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>Request changes
                    </button>
                    <button v-if="isReviewer() && ['pendingIR', 'processingOrder', 'changesRequested'].includes(order.status)" type="button" class="danger" :disabled="busy" @click="openRejectDialog()">
                        <span class="material-symbols-outlined" aria-hidden="true">block</span>Reject order
                    </button>
                    <button v-if="isAuthor() && ['draft', 'pendingIR', 'changesRequested'].includes(order.status)" type="button" class="quiet-danger" :disabled="busy" @click="$refs.cancelDialog.showModal()">
                        Cancel order
                    </button>
                </div>
                <div v-if="hasMoreActions()" class="more-actions" @focusout="onMoreFocusOut">
                    <button type="button" ref="moreButton" aria-controls="more-actions-list" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">
                        <span class="material-symbols-outlined" aria-hidden="true">more_horiz</span>More
                    </button>
                    <ul v-show="moreOpen" id="more-actions-list" class="more-actions-list" @keydown.esc.stop="closeMore(true)">
                        <li v-if="canAskAnotherReferent()">
                            <button type="button" @click="openReviewRequestDialog()">
                                <span class="material-symbols-outlined" aria-hidden="true">person_add</span>Ask another referent…
                            </button>
                        </li>
                        <li>
                            <button type="button" :disabled="busy" @click="closeMore(true); setArchived(!order.archived)">
                                <span class="material-symbols-outlined" aria-hidden="true">{{ order.archived ? 'unarchive' : 'inventory_2' }}</span>{{ order.archived ? 'Unarchive' : 'Archive' }}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            <dl class="summary-facts">
                <div>
                    <dt>Referent</dt>
                    <dd>{{ order.referent ? displayName(order.referent) : '—' }}</dd>
                </div>
                <div>
                    <dt>Supplier</dt>
                    <dd>{{ order.supplier }}</dd>
                </div>
                <div>
                    <dt>Total</dt>
                    <dd>{{ formatEuros(orderTotal(order.items)) }}</dd>
                </div>
                <div>
                    <dt>Priority</dt>
                    <dd :class="priorityToColor[order.priority] ? priorityToColor[order.priority] : 'green'">{{ order.priority ? order.priority.charAt(0).toUpperCase()+ order.priority.slice(1) : "Low" }}</dd>
                </div>
                <div>
                    <dt>Tags</dt>
                    <dd>{{ (order.tags || []).map(tagName).join(", ") || "None" }}</dd>
                </div>
                <div>
                    <dt>Last update</dt>
                    <dd><RelativeTime :value="order.lastUpdate" /></dd>
                </div>
            </dl>
        </section>

        <div class="section-header">
            <h2 class="section-title">
                <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
                Items <span class="group-count">{{ order.items.length }}</span>
            </h2>
            <button type="button" v-if="canEdit()" :class="{ primary: editingItems }" @click="toggleEditItems()">
                <span class="material-symbols-outlined" aria-hidden="true">{{ editingItems ? 'check' : 'edit' }}</span>{{ editingItems ? "Save items" : "Edit items" }}
            </button>
        </div>

        <div id="items-list" class="table-scroll">
            <table class="data-table orderview-table">
                <caption class="visually-hidden">Items in this order</caption>
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Link</th>
                        <th scope="col">Quantity</th>
                        <th scope="col">Unit price</th>
                        <th scope="col">Total</th>
                        <th scope="col" v-if="editingItems">Actions</th>
                        <th scope="col" v-else>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in order.items" :key="index">
                        <template v-if="editingItems">
                            <td class="col-name" data-label="Name">
                                <input type="text" v-model="item.name" required :aria-label="`Item ${index + 1} name`">
                                <p v-if="item.rejected" class="item-rejection">
                                    Rejected<template v-if="item.rejectedReason">: {{ item.rejectedReason }}</template>
                                    <button type="button" class="put-back" @click="putBack(item)">Put back<span class="visually-hidden"> {{ item.name }}</span></button>
                                </p>
                            </td>
                            <td class="col-link" data-label="Link"><input type="url" v-model="item.link" required :aria-label="`Item ${index + 1} link`"></td>
                            <td class="col-qty" data-label="Quantity"><input type="number" inputmode="numeric" v-model="item.quantity" required min="1" :aria-label="`Item ${index + 1} quantity`"></td>
                            <td class="col-price" data-label="Unit price (€)"><input type="number" inputmode="decimal" v-model="item.price" min="0.00" max="10000.00" step="0.001" required :aria-label="`Item ${index + 1} unit price in euros`"></td>
                            <td class="col-total" data-label="Total">{{ formatEuros(orderTotal([item])) }}</td>
                            <td class="col-actions">
                                <div class="center-both">
                                    <button type="button" class="icon-button red" @click="deleteItem(index)" :aria-label="`Delete item ${index + 1}`" title="Delete item">
                                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                                    </button>
                                    <button type="button" class="icon-button" @click="copyItemToClipboard(item)" :aria-label="`Copy item ${index + 1}`" title="Copy item">
                                        <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
                                    </button>
                                </div>
                            </td>
                        </template>
                        <template v-else>
                            <td class="col-name">
                                <span :class="{ 'rejected-name': item.rejected }">{{ item.name }}</span>
                                <StockBadge v-if="!item.rejected" compact :stock="stockFor(item)" />
                                <span v-if="item.rejected" class="item-rejection">
                                    Rejected by {{ displayName(item.rejectedBy) }}<template v-if="item.rejectedReason">: {{ item.rejectedReason }}</template>
                                </span>
                            </td>
                            <td class="col-link item-link"><a :href="item.link" :title="item.link" target="_blank" rel="noopener">{{ item.link }}<span class="visually-hidden"> (opens in a new tab)</span></a></td>
                            <td class="col-qty" data-label="Quantity">{{ item.quantity }}</td>
                            <td class="col-price" data-label="Unit price">{{ formatEuros(parseFloat(item.price)) }}</td>
                            <td class="col-total" data-label="Total">
                                <s v-if="item.rejected"><span class="visually-hidden">Not counted: </span>{{ formatEuros(itemTotal(item)) }}</s>
                                <template v-else>{{ formatEuros(itemTotal(item)) }}</template>
                            </td>
                            <td class="col-actions">
                                <div class="item-actions">
                                    <button v-if="isReviewer() && getItemNextStatus(item) != 'none'" type="button"
                                        v-on:click="updateItemStatus(index, getItemNextStatus(item), true)" class="mark-item">
                                        Mark as {{ getItemNextStatus(item) }}<span class="visually-hidden">: {{ item.name }}</span>
                                    </button>
                                    <span v-else class="order-item-status" :class="getItemStatusColor(item)">
                                        {{ getItemStatus(item) }}
                                    </span>
                                    <template v-if="canRejectItems()">
                                        <button v-if="item.rejected" type="button" :disabled="busy" @click="restoreItem(index)">
                                            Restore<span class="visually-hidden"> {{ item.name }}</span>
                                        </button>
                                        <button v-else-if="!item.ordered" type="button" class="icon-button red" :disabled="busy"
                                            :aria-label="`Reject item: ${item.name}`" title="Reject this item" @click="openRejectItemDialog(index)">
                                            <span class="material-symbols-outlined" aria-hidden="true">block</span>
                                        </button>
                                    </template>
                                </div>
                            </td>
                        </template>
                    </tr>
                </tbody>
            </table>
            <p v-if="!editingItems && stockLegend.length" class="stock-legend">
                <span v-for="level in stockLegend" :key="level.key" :class="level.color">
                    <span class="material-symbols-outlined" aria-hidden="true">{{ level.icon }}</span>
                    {{ level.item }}
                </span>
                <span>(from the <router-link to="/parts">parts catalogue</router-link>)</span>
            </p>
            <div v-if="editingItems" class="full-width center-both">
                <button type="button" class="icon-button add-item" v-on:click="addItem()" aria-label="Add item" title="Add item">
                    <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
                </button>
                <button type="button" class="icon-button add-item" v-on:click="pasteItemFromClipboard()" aria-label="Paste item" title="Paste item">
                    <span class="material-symbols-outlined" aria-hidden="true">content_paste</span>
                </button>
            </div>
            <div v-if="editingItems" class="items-save">
                <button type="button" class="primary" @click="toggleEditItems()">
                    <span class="material-symbols-outlined" aria-hidden="true">check</span>Save items
                </button>
            </div>
        </div>



        <InvoicesPanel
            v-if="isReviewer() && ['ordered', 'received', 'completed'].includes(order.status)"
            :order="order"
            :orderId="order_id"
        />

        <h2 class="section-title">
            <span class="material-symbols-outlined" aria-hidden="true">history</span>
            History
        </h2>


        <ul id="updates">
            <li v-for="(update, index) in order.updates" :key="index" class="update">

                <div v-if="update.type == 'comment'" class="update-comment">
                    <div class="vline"></div>
                    <div class="update-comment-content">

                        <div class="update-header">
                            <p class="update-title">{{ update.author }}&nbsp;</p>
                            <p class="update-date">commented <RelativeTime :value="update.date" /></p>
                        </div>
                        <p class="update-message">{{ update.message }}</p>
                    </div>
                </div>
                <div v-else-if="update.type == 'review-requested'" class="update-notification">
                    <div class="vline"></div>
                    <div class="symbol">
                        <span class="material-symbols-outlined" aria-hidden="true">{{ updateTypesToIcon[update.type] ?  updateTypesToIcon[update.type] : 'notifications' }}</span>
                    </div>
                    <div class="update-header">
                        <h3 class="update-title" :class="updateTypesToColor[update.type] ? updateTypesToColor[update.type] : 'red'">{{ updateTypesToMessage[update.type] || update.type }} to {{ update.message }}&nbsp;</h3>
                        <p class="update-author">by {{ update.author }},&nbsp;</p>
                        <p class="update-date"><RelativeTime :value="update.date" /></p>
                    </div>
                </div>

                <div v-else class="update-notification">
                    <div class="vline"></div>
                    <div class="symbol">
                        <span class="material-symbols-outlined" aria-hidden="true">{{ updateTypesToIcon[update.type] ?  updateTypesToIcon[update.type] : 'notifications' }}</span>
                    </div>
                    <div class="update-header">
                        <h3 class="update-title" :class="updateTypesToColor[update.type] ? updateTypesToColor[update.type] : 'red'">{{ updateTypesToMessage[update.type] || update.type }}&nbsp;</h3>
                        <p class="update-author">by {{ update.author }},&nbsp;</p>
                        <p class="update-date"><RelativeTime :value="update.date" /></p>
                    </div>
                </div>
            </li>
        </ul>

        <form id="comment-div" class="full-width" @submit.prevent="addComment()">
            <label for="comment-textarea">Add a comment</label>
            <div class="center-row small-gap">
                <textarea id="comment-textarea" v-model="newComment" maxlength="1000" class="full-width"></textarea>
                <button type="submit" class="send-button">
                    <span class="material-symbols-outlined" aria-hidden="true">send</span>
                    Send
                </button>
            </div>
        </form>

        <dialog ref="reviewRequestDialog" class="dialog" aria-labelledby="review-request-title">
            <form @submit.prevent="sendReviewRequest()" novalidate>
                <h2 id="review-request-title">Ask another referent</h2>
                <p>They get an email asking them to review this order. You can ask the same person again after two days.</p>
                <label for="reviewer-select">Referent</label>
                <select id="reviewer-select" ref="reviewerSelect" v-model="selectedReviewer" required>
                    <option value="" disabled>Choose a referent</option>
                    <option v-for="reviewer in reviewers.filter(reviewer => reviewer.email !== currentUser.email && isReviewRequestAllowed(reviewer.email))" :key="reviewer.id" :value="reviewer.email">{{ displayName(reviewer.email) }} ({{ reviewer.email }})</option>
                </select>
                <div class="dialog-actions">
                    <button type="button" @click="$refs.reviewRequestDialog.close()">Cancel</button>
                    <button type="submit" class="primary" :disabled="!selectedReviewer">Send request</button>
                </div>
            </form>
        </dialog>

        <dialog ref="rejectDialog" class="dialog" aria-labelledby="reject-title">
            <form @submit.prevent="confirmReject()" novalidate>
                <h2 id="reject-title">Reject this order?</h2>
                <p>{{ order.requestedBy }} will receive your reason by email.</p>
                <label for="reject-reason">Reason</label>
                <textarea
                    id="reject-reason"
                    ref="rejectReason"
                    v-model="rejectReason"
                    rows="4"
                    maxlength="1000"
                    required
                    :aria-invalid="!!rejectError"
                    aria-describedby="reject-error"
                ></textarea>
                <p id="reject-error" class="field-error" role="alert">{{ rejectError }}</p>
                <div class="dialog-actions">
                    <button type="button" @click="$refs.rejectDialog.close()">Keep reviewing</button>
                    <button type="submit" class="danger" :disabled="busy">Reject order</button>
                </div>
            </form>
        </dialog>

        <dialog ref="changesDialog" class="dialog" aria-labelledby="changes-title">
            <form @submit.prevent="confirmRequestChanges()" novalidate>
                <h2 id="changes-title">Request changes</h2>
                <p>
                    The order goes back to {{ order.requestedBy }}, who gets your message by email, makes the changes
                    and sends it back for review.<template v-if="order.status === 'processingOrder'"> It will need approving again.</template>
                </p>
                <label for="changes-message">What should change?</label>
                <textarea
                    id="changes-message"
                    ref="changesMessage"
                    v-model="changesMessage"
                    rows="4"
                    maxlength="1000"
                    required
                    placeholder="e.g. The servo you picked is out of stock: choose another one, or explain why you need this exact model."
                    :aria-invalid="!!changesError"
                    aria-describedby="changes-error"
                ></textarea>
                <p id="changes-error" class="field-error" role="alert">{{ changesError }}</p>
                <div class="dialog-actions">
                    <button type="button" @click="$refs.changesDialog.close()">Keep reviewing</button>
                    <button type="submit" class="primary" :disabled="busy">Request changes</button>
                </div>
            </form>
        </dialog>

        <dialog ref="sendBackDialog" class="dialog" aria-labelledby="send-back-title">
            <form @submit.prevent="confirmSendBack()" novalidate>
                <h2 id="send-back-title">Send back for review</h2>
                <p>Your referent gets an email with your reply and reviews the order again.</p>
                <label for="send-back-message">What did you change?</label>
                <textarea
                    id="send-back-message"
                    ref="sendBackMessage"
                    v-model="sendBackMessage"
                    rows="4"
                    maxlength="1000"
                    required
                    placeholder="e.g. Replaced the servo with the SG90 from the catalogue. I put the cables back: we need 6 and the lab has only 2."
                    :aria-invalid="!!sendBackError"
                    aria-describedby="send-back-error"
                ></textarea>
                <p id="send-back-error" class="field-error" role="alert">{{ sendBackError }}</p>
                <div class="dialog-actions">
                    <button type="button" @click="$refs.sendBackDialog.close()">Not yet</button>
                    <button type="submit" class="primary" :disabled="busy">Send back</button>
                </div>
            </form>
        </dialog>

        <dialog ref="rejectItemDialog" class="dialog" aria-labelledby="reject-item-title">
            <form @submit.prevent="confirmRejectItem()" novalidate>
                <h2 id="reject-item-title">Reject this item?</h2>
                <p>
                    <strong>{{ order.items[rejectItemIndex] && order.items[rejectItemIndex].name }}</strong> won't be ordered;
                    the rest of the order goes on. {{ order.requestedBy }} will receive your reason by email.
                </p>
                <label for="reject-item-reason">Reason</label>
                <textarea
                    id="reject-item-reason"
                    ref="rejectItemReason"
                    v-model="rejectItemReason"
                    rows="3"
                    maxlength="1000"
                    required
                    :aria-invalid="!!rejectItemError"
                    aria-describedby="reject-item-error"
                ></textarea>
                <p id="reject-item-error" class="field-error" role="alert">{{ rejectItemError }}</p>
                <div class="dialog-actions">
                    <button type="button" @click="$refs.rejectItemDialog.close()">Keep it</button>
                    <button type="submit" class="danger" :disabled="busy">Reject item</button>
                </div>
            </form>
        </dialog>

        <dialog ref="justifyDialog" class="dialog" aria-labelledby="justify-title">
            <form @submit.prevent="submitJustification()" novalidate>
                <h2 id="justify-title">Why do you need these parts?</h2>
                <p>Referents read this before approving your order.</p>
                <label for="justification">Justification</label>
                <textarea
                    id="justification"
                    ref="justification"
                    v-model="justification"
                    rows="6"
                    maxlength="1000"
                    :placeholder="JUSTIFICATION_PLACEHOLDER"
                    :aria-invalid="!!justificationError"
                    aria-describedby="justification-count justification-error"
                ></textarea>
                <p id="justification-count" class="field-hint" :class="{ met: justification.trim().length >= MIN_JUSTIFICATION }">
                    {{ justification.trim().length }} / {{ MIN_JUSTIFICATION }} characters minimum
                </p>
                <p id="justification-error" class="field-error" role="alert">{{ justificationError }}</p>
                <div class="dialog-actions">
                    <button type="button" @click="$refs.justifyDialog.close()">Not yet</button>
                    <button type="submit" class="primary" :disabled="busy">Submit order</button>
                </div>
            </form>
        </dialog>

        <dialog ref="cancelDialog" class="dialog" aria-labelledby="cancel-title">
            <form @submit.prevent="confirmCancel()">
                <h2 id="cancel-title">Cancel this order?</h2>
                <p>It will no longer be reviewed or ordered. You can't undo this.</p>
                <div class="dialog-actions">
                    <button type="button" @click="$refs.cancelDialog.close()">Keep order</button>
                    <button type="submit" class="danger" :disabled="busy">Cancel order</button>
                </div>
            </form>
        </dialog>
    </div>
    <p v-else role="status">Loading order…</p>
</template>


<style>

.order-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding: var(--space-5);
    margin-bottom: var(--space-6);
    border-radius: var(--radius);
    border: 1px solid var(--border-muted);
    background-color: var(--bg);
}

.summary-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-4);
}

.summary-top h1 {
    margin: 0;
}

.summary-meta {
    margin: var(--space-1) 0 0 0;
}

.next-step {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius);
    background-color: var(--bg-light);
    color: var(--text);
}

.next-step .material-symbols-outlined {
    color: var(--link);
}

.next-step.ended .material-symbols-outlined {
    color: var(--text-muted);
}

.changes-note {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    margin: calc(-1 * var(--space-3)) 0 0 0;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius);
    border: 1px solid var(--orange);
    background-color: color-mix(in oklch, var(--orange) 10%, var(--bg));
}

.changes-note .material-symbols-outlined {
    color: var(--orange);
}

.changes-note p {
    margin: 0;
}

.changes-note-title {
    font-size: var(--font-sm);
    color: var(--text-muted);
}

.changes-note-message {
    color: var(--text);
    white-space: pre-line;
}

.put-back {
    margin-left: var(--space-2);
    min-height: 2rem;
    padding: 0 var(--space-3);
    font-size: var(--font-sm);
}

.archived-note {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    margin: calc(-1 * var(--space-3)) 0 0 0;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius);
    border: 1px dashed var(--border);
    color: var(--text);
}

.archived-note .material-symbols-outlined {
    color: var(--text-muted);
}

.summary-facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--space-4);
    margin: 0;
}

.summary-facts dt {
    font-size: var(--font-sm);
    color: var(--text-muted);
}

.summary-facts dd {
    margin: 0;
    color: var(--text);
    overflow-wrap: anywhere;
}

.section-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-lg);
}

@media (max-width: 47.99rem) {
    .order-summary {
        padding: var(--space-4);
    }

    .summary-top {
        flex-direction: column;
    }

    .summary-top h1 {
        font-size: 1.4rem;
    }
}

.order-item-status {
    text-transform: capitalize;
}

.item-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
}

.rejected-name {
    text-decoration: line-through;
    color: var(--text-muted);
}

.item-rejection {
    display: block;
    margin-top: var(--space-1);
    font-size: var(--font-sm);
    color: var(--red);
}

#tags-div {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
}

.stock-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-4);
    margin: var(--space-2) 0 0 0;
    font-size: var(--font-sm);
}

.stock-legend > span[class] {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
}

.stock-legend .material-symbols-outlined {
    font-size: 1.1rem;
}

.orderview-table input[type="number"] {
    max-width: 8rem;
}

/* Phones and tablets: each item becomes a card */
@media (max-width: 59.99rem) {
    .orderview-table thead {
        display: block;
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
    }

    .orderview-table, .orderview-table tbody, .orderview-table tr, .orderview-table td {
        display: block;
    }

    .orderview-table tbody tr {
        padding: 0.75rem 1rem;
    }

    .orderview-table td {
        padding: 0.2rem 0;
        text-align: left;
    }

    .orderview-table td[data-label]::before {
        content: attr(data-label) ": ";
        color: var(--text-muted);
        font-weight: 400;
    }

    /* In edit mode the label sits above its field */
    .orderview-table td[data-label]:has(input)::before {
        display: block;
        content: attr(data-label);
    }

    .orderview-table .col-name {
        font-size: 1.05rem;
        color: var(--text);
    }

    .orderview-table input[type="number"] {
        max-width: none;
    }

    .orderview-table .col-actions {
        padding-top: 0.5rem;
    }

    .orderview-table .col-actions button:not(.icon-button) {
        flex: 1;
    }

    .orderview-table .item-actions {
        justify-content: flex-start;
    }

    .orderview-table .col-actions .center-both {
        justify-content: flex-start;
    }
}

.add-item {
    font-size: 2rem;
    margin: 0.5rem;
}

.edit-buttons {
    justify-content: center;
}

.review-buttons {
    justify-content: center;
}


#pi-review-div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
}

/* Actions in the summary card: main action first, occasional ones after, More at the far right */
.order-actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3) var(--space-5);
    flex-wrap: wrap;
}

.order-actions-main {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
}

.order-actions button, .section-header button, .items-save button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
}

.order-actions button .material-symbols-outlined,
.section-header button .material-symbols-outlined,
.items-save button .material-symbols-outlined {
    font-size: 1.25rem;
}

/* Cancelling is rare and undoable only by asking again: present but quiet */
button.quiet-danger {
    border-color: transparent;
    background: none;
    color: var(--red);
}

@media (hover: hover) and (pointer: fine) {
    button.quiet-danger:hover:not(:disabled) {
        border-color: var(--red);
    }
}

.more-actions {
    position: relative;
    margin-left: auto;
}

.more-actions-list {
    position: absolute;
    right: 0;
    top: calc(100% + var(--space-1));
    z-index: 20;
    min-width: 14rem;
    margin: 0;
    padding: var(--space-1);
    list-style: none;
    border: 1px solid var(--border-muted);
    border-radius: var(--radius);
    background-color: var(--bg-light);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
}

.more-actions-list button {
    width: 100%;
    white-space: nowrap;
    justify-content: flex-start;
    border-color: transparent;
    background: none;
    text-align: left;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    flex-wrap: wrap;
}

.items-save {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--space-3);
}

@media (max-width: 47.99rem) {
    /* Phones: the main action gets its own full-width line, the others share the next ones */
    .order-actions, .order-actions-main {
        width: 100%;
    }

    .order-actions-main > button {
        flex: 1 1 auto;
    }

    .order-actions-main > button.primary {
        flex-basis: 100%;
    }

    .more-actions {
        width: 100%;
    }

    .more-actions > button {
        width: 100%;
    }

    .more-actions-list {
        left: 0;
        right: 0;
    }
}

#updates {
    padding: 0;
    height: fit-content;
}

.update {
    position: relative;
    padding: 1rem 0 1rem 0;
    list-style-type: none;
}

.vline {
    position: absolute;
    top: 0;
    left: 1.5rem;
    bottom: 0;
    border: calc(var(--border-timeline)/2) solid var(--text);
    z-index: 0;
}

.symbol {
    position: absolute;
    top: calc(50% - 1rem);
    left: calc(0.5rem - var(--border-timeline)/2);
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: var(--border-timeline) solid var(--text);
    background-color: var(--bg);
    display: flex;
    justify-content: center;
    align-items: center;
}

.symbol > span {
    color: var(--text);
    font-size: 1.5rem;
}

.update-notification {
    padding-left: 3rem;
}

.update-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    border-radius: 0.5rem;
}

@media (max-width: 1024px) {
    .update-header {
        flex-direction: column;
    }
}

.update-title {
    color: var(--color-text-secondary);
    font-weight: bold;
    margin: 0;
}

.update-author {
    color: var(--color-text-secondary);
    font-style: italic;
    font-size: 1rem;
    margin: 0;
}

.update-date{
    font-size: 1rem;
    font-style: italic;
    margin: 0;
}

.update-message {
    font-size: 1rem;
    margin: 0;
    font-weight: 400;
}

.update-comment-content {
    padding: 0 !important;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-top: 1px solid var(--highlight);
    box-shadow: 0px var(--s-shade) var(--s-shade) hsl(0, 0%, 0%, 0.15), 0px var(--b-shade) var(--b-shade) hsl(0, 0%, 0%, 0.3);

    border-radius: 0.5rem;
}

.update-comment hr{
    /* background-color: var(--color-primary); */
    /* border: 1px solid var(--text); */
    border-radius: 0.5rem;
    margin: 0;
}

.update-comment .update-message {
    position: relative;
    padding: 0.75rem;
    background-color: var(--bg);
    border-radius: 0.5rem;
    white-space: pre-wrap;
    /* Long URLs in comments wrap instead of being cut off */
    overflow-wrap: anywhere;
}

.update-comment .update-header {
    position: relative;
    padding: 0.75rem;
    background-color: var(--bg);
}

.update-comment .update-header > * {
    color: var(--text);
}

#comment-div {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
}

#comment-div > .center-row {
    align-items: flex-end;
}

@media (max-width: 47.99rem) {
    #comment-div > .center-row {
        flex-direction: column;
        align-items: stretch;
    }
}

#comment-div textarea {
    width: 100%;
    height: 5rem;
    box-sizing: border-box;
}



.send-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
}

/* Long URLs are cropped with an ellipsis; the full address is in the link's tooltip */
.item-link a {
    display: block;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}

/* In the desktop table the link cell must not grow to fit the URL: max-width 0 plus a share of the
   width lets the ellipsis kick in (below 60rem the items are cards and the cell is already bounded) */
@media (min-width: 60rem) {
    .orderview-table .col-link {
        width: 30%;
        max-width: 0;
    }
}


/* # {
    grid-template-columns: 1fr 1fr 1fr 1fr;
}

.link {
    max-width: 40%;
}

a {
    display: block;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
} */
</style>
