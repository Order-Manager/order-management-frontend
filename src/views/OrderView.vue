<script>
import { computed, ref } from "vue";

import { useDocument, useFirestore, useCurrentUser, useCollection } from 'vuefire'
import { doc, updateDoc, collection, arrayUnion } from "firebase/firestore";


import { useRoute } from 'vue-router'

import { updateTypesToMessage, statusTypesToMessage, statusTypesToColor, updateTypesToColor, updateTypesToIcon, priorityToColor } from '../utils/definitions.js'

import { useToast } from "vue-toastification";


export default {
    methods: {
        goToOrder(date) {
            this.$router.push(`/view/${date}`)
        },
        cancelOrder() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            updateDoc(orderRef, {
                "status": "cancelled",
                "cancelledBy": this.currentUser.email
            })

            this.showSuccess("Order cancelled!")
        },
        publishOrder() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            updateDoc(orderRef, {
                "status": "pendingIR",
            })
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
        rejectedByIR() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()

            updateDoc(orderRef, {
                "status": "refusedIR",
                "reviewIR": false,
                "reviewIRBy": currentUser.value.email,
            })
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
                this.isAuthor() && this.order.status === "pendingIR"
                || this.isReviewer()
            );
        },
        updateItemStatus(index, field, value) {
            this.order.items[index][field] = value;

            if (this.order.status == "processingOrder" && this.order.items.every(item => item.ordered)) {
                this.setOrderStatus("ordered");
            }

            if (this.order.status == "ordered" && this.order.items.every(item => item.delivered)) {
                this.setOrderStatus("received");
            }

            if (this.order.status == "received" && this.order.items.every(item => item.completed)) {
                this.setOrderStatus("completed");
            }

            const db = useFirestore();
            const orderRef = doc(db, 'orders', this.order_id);
            updateDoc(orderRef, {
                items: this.order.items,
                "lastItemsUpdatedBy": this.currentUser.email,
                "ignoreItemsModification": true,
            });

            this.showSuccess(`Item status updated!`);
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
        "order.title": {
            handler(title) {
                if (title) document.title = `${title} · IFT Orders`;
            },
            immediate: true,
        },
    },
    data() {
        return {
            editingItems: false, // Toggle for editing items
            newComment: "",
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

        return {
            order, order_id, updateTypesToMessage, statusTypesToMessage, userData, statusTypesToColor, updateTypesToColor, updateTypesToIcon, priorityToColor, tags, currentUser, toast, supplierUrl, reviewers, selectedReviewer
        }
    }
}
</script>

<template>
    <div v-if="order">
        <div class="center-column">
            <div id="order-header">
                <h1>{{ order.title }}</h1>
                <p>Requested by {{ order.requestedBy }}</p>
            </div>
        </div>
        <dl id="order-info">
            <div class="order-info">
                <dt>Status</dt>
                <dd :class="statusTypesToColor[order.status] ? statusTypesToColor[order.status] : 'red'">{{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</dd>
            </div>
            <div class="order-info">
                <dt>Last update</dt>
                <dd>{{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</dd>
            </div>
            <div class="order-info">
                <dt>Priority</dt>
                <dd :class="priorityToColor[order.priority] ? priorityToColor[order.priority] : 'green'">{{ order.priority ? order.priority.charAt(0).toUpperCase()+ order.priority.slice(1) : "Low" }}</dd>
            </div>
            <div class="order-info">
                <dt>Tags</dt>
                <dd>{{ (order.tags || []).map(tagName).join(", ") }}</dd>
            </div>
            <div class="order-info">
                <dt>Supplier</dt>
                <dd>{{ order.supplier }}</dd>
            </div>
            <div class="order-info">
                <dt>Created</dt>
                <dd>{{ order.creationDate.toDate().toLocaleString("en-GB") }}</dd>
            </div>
        </dl>


        <div class="center-column full-width">
            <h2 class="center-row section-title">
                <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
                Items: {{ Math.floor(1000 * order.items.reduce((acc, item) => acc + parseFloat(item.price) * parseFloat(item.quantity), 0)) / 1000 }}€
            </h2>
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
                            <td class="col-name" data-label="Name"><input type="text" v-model="item.name" required :aria-label="`Item ${index + 1} name`"></td>
                            <td class="col-link" data-label="Link"><input type="url" v-model="item.link" required :aria-label="`Item ${index + 1} link`"></td>
                            <td class="col-qty" data-label="Quantity"><input type="number" inputmode="numeric" v-model="item.quantity" required min="1" :aria-label="`Item ${index + 1} quantity`"></td>
                            <td class="col-price" data-label="Unit price (€)"><input type="number" inputmode="decimal" v-model="item.price" min="0.00" max="10000.00" step="0.001" required :aria-label="`Item ${index + 1} unit price in euros`"></td>
                            <td class="col-total" data-label="Total">{{ Math.floor(1000 * parseFloat(item.price) * parseFloat(item.quantity)) / 1000 }}€</td>
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
                            <td class="col-name">{{ item.name }}</td>
                            <td class="col-link item-link"><a :href="item.link" target="_blank" rel="noopener">{{ item.link }}<span class="visually-hidden"> (opens in a new tab)</span></a></td>
                            <td class="col-qty" data-label="Quantity">{{ item.quantity }}</td>
                            <td class="col-price" data-label="Unit price">{{ item.price }}€</td>
                            <td class="col-total" data-label="Total">{{ Math.floor(1000 * parseFloat(item.price) * parseFloat(item.quantity)) / 1000 }}€</td>
                            <td class="col-actions">
                                <button v-if="isReviewer() && getItemNextStatus(item) != 'none'" type="button"
                                    v-on:click="updateItemStatus(index, getItemNextStatus(item), true)" class="alt-button">
                                    Mark as {{ getItemNextStatus(item) }}<span class="visually-hidden">: {{ item.name }}</span>
                                </button>
                                <span v-else class="order-item-status" :class="getItemStatusColor(item)">
                                    {{ getItemStatus(item) }}
                                </span>
                            </td>
                        </template>
                    </tr>
                </tbody>
            </table>
            <div v-if="editingItems" class="full-width center-both">
                <button type="button" class="icon-button add-item" v-on:click="addItem()" aria-label="Add item" title="Add item">
                    <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
                </button>
                <button type="button" class="icon-button add-item" v-on:click="pasteItemFromClipboard()" aria-label="Paste item" title="Paste item">
                    <span class="material-symbols-outlined" aria-hidden="true">content_paste</span>
                </button>
            </div>
        </div>

        <div id="approval-buttons">
            <button type="button" class="alt-button" v-if="canEdit()" @click="toggleEditItems()">
                {{ editingItems ? "Save items" : "Edit items" }}
            </button>

            <button type="button" class="green"
                v-if="isAuthor() && ['draft'].includes(order.status)"
                v-on:click="publishOrder()">
                Create order
            </button>

            <button type="button" class="green"
                v-if="isReviewer() && ['pending', 'refused', 'pendingIR', 'refusedIR'].includes(order.status)"
                v-on:click="approvedByIR(false)">
                Approve order
            </button>

            <div v-if="isReviewer() && ['pendingIR', 'refusedIR'].includes(order.status)" class="center-row small-gap">
                <label for="reviewer-select" class="visually-hidden">Reviewer</label>
                <select id="reviewer-select" v-model="selectedReviewer">
                    <option value="" disabled>Choose a reviewer</option>
                    <option v-for="reviewer in reviewers.filter(reviewer =>  isReviewRequestAllowed(reviewer.email))" :key="reviewer.id" :value="reviewer.email">{{ reviewer.email }}</option>
                </select>
                <button type="button" class="blue"
                    v-on:click="requestReview()">
                    Send review request
                </button>
            </div>

            <button type="button"
                v-if="isReviewer() && ['processingOrder'].includes(order.status)"
                v-on:click="setOrderStatus('ordered')">
                Mark as ordered
            </button>

            <button type="button"
                v-if="isReviewer() && ['ordered'].includes(order.status)"
                v-on:click="setOrderStatus('received')">
                Mark as delivered
            </button>

            <button type="button"
                v-if="isReviewer() && ['received'].includes(order.status)"
                v-on:click="setOrderStatus('completed')">
                Mark as completed
            </button>

            <button type="button" class="red"
                v-if="isReviewer() && ['pendingIR', 'processingOrder'].includes(order.status)"
                v-on:click="rejectedByIR()">
                Reject order
            </button>

            <button type="button" class="red"
                v-if="isAuthor() && ['draft', 'pendingIR'].includes(order.status)"
                v-on:click="cancelOrder()">
                Cancel order
            </button>

        </div>


        <div class="center-column full-width">
            <h2 class="center-row section-title">
                <span class="material-symbols-outlined" aria-hidden="true">history</span>
                Updates
            </h2>
        </div>


        <ul id="updates">
            <li v-for="(update, index) in order.updates" :key="index" class="update">

                <div v-if="update.type == 'comment'" class="update-comment">
                    <div class="vline"></div>
                    <div class="update-comment-content">

                        <div class="update-header">
                            <p class="update-title">{{ update.author }}&nbsp;</p>
                            <p class="update-date">commented on the {{ update.date.toDate().toLocaleString('en-GB') }}</p>
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
                        <h3 class="update-title" :class="updateTypesToColor[update.type] ? updateTypesToColor[update.type] : 'red'">{{ updateTypesToMessage[update.type] }} to {{ update.message }}&nbsp;</h3>
                        <p class="update-author">by {{ update.author }},&nbsp;</p>
                        <p class="update-date">{{ update.date.toDate().toLocaleString('en-GB') }}</p>
                    </div>
                </div>

                <div v-else class="update-notification">
                    <div class="vline"></div>
                    <div class="symbol">
                        <span class="material-symbols-outlined" aria-hidden="true">{{ updateTypesToIcon[update.type] ?  updateTypesToIcon[update.type] : 'notifications' }}</span>
                    </div>
                    <div class="update-header">
                        <h3 class="update-title" :class="updateTypesToColor[update.type] ? updateTypesToColor[update.type] : 'red'">{{ updateTypesToMessage[update.type] }}&nbsp;</h3>
                        <p class="update-author">by {{ update.author }},&nbsp;</p>
                        <p class="update-date">{{ update.date.toDate().toLocaleString('en-GB') }}</p>
                    </div>
                </div>
            </li>
        </ul>

        <form id="comment-div" class="full-width" @submit.prevent="addComment()">
            <label for="comment-textarea">Add a comment</label>
            <div class="center-row small-gap">
                <textarea id="comment-textarea" v-model="newComment" maxlength="1000" class="full-width"></textarea>
                <button type="submit" class="alt-button send-button">
                    <span class="material-symbols-outlined" aria-hidden="true">send</span>
                    Send
                </button>
            </div>
        </form>
    </div>
    <p v-else role="status">Loading order…</p>
</template>


<style>

#order-info {
    margin: 0 0 1rem 0;
}

.order-info {
    display: flex;
    gap: 1rem;
    padding: 0.15rem 0;
}

.order-info dt {
    min-width: 10rem;
    font-size: 1.1rem;
    color: var(--color-text-secondary);
}

.order-info dd {
    margin: 0;
    color: var(--color-text-secondary);
}

.section-title {
    gap: 0.5rem;
}

#order-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
}

#order-header * {
    margin-top: 0;
}

#order-header p {
    margin-left: 1rem;
}


@media (max-width: 768px) {

    #order-header {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    #order-header h1 {
        margin: 1rem 0 0 0;
        text-align: center;
    }

    #order-header p {
        margin: 0 0 1rem 0;
    }
}

.order-item-status {
    text-transform: capitalize;
}

#tags-div {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
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

    .orderview-table .col-actions button {
        width: 100%;
    }

    .orderview-table .col-actions .center-both {
        justify-content: flex-start;
    }

    .order-info dt {
        min-width: 7rem;
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

#approval-buttons {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    gap: 0.75rem 1rem;
    padding-top: 2rem;
}

#approval-buttons > .center-row {
    flex-wrap: wrap;
}

@media (max-width: 47.99rem) {
    #approval-buttons > button,
    #approval-buttons > .center-row,
    #approval-buttons > .center-row > * {
        flex: 1 1 100%;
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
    overflow: hidden;
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

.item-link a {
    display: block;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
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
