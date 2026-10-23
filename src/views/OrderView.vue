<script>
import { computed, ref } from "vue";

import Return from '../components/Return.vue'
import { useDocument, useFirestore, useCurrentUser, useCollection } from 'vuefire'
import { doc, updateDoc, collection } from "firebase/firestore";


import { useRoute } from 'vue-router'

import { updateTypesToMessage, statusTypesToMessage, statusTypesToColor, updateTypesToColor, updateTypesToIcon, priorityToColor } from '../utils/definitions.js'

import { useToast } from "vue-toastification";


export default {
    components: {
        Return
    },
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
            const area = document.getElementById("comment-textarea")
            const comment = area.value

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
                "updates": [
                    ...this.order.updates,
                    {
                        "type": "comment",
                        "date": new Date(),
                        "author": currentUser.value.email,
                        "message": comment
                    }
                ]
            })
            area.value = ""
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
    data() {
        return {
            editingItems: false, // Toggle for editing items
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
        const reviewers = useCollection(collection(db, 'admins'))
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
    <Return />

    <div v-if="order">
        <div class="center-column">
            <div id="order-header">
                <h2>{{ order.title }}</h2>
                <p>&nbsp;&nbsp;&nbsp;by {{ order.requestedBy }}</p>
            </div>
        </div>
        <div>
            <div class="full-width center-row order-info">
                <label>Status:</label><p name="status" :class="statusTypesToColor[order.status] ? statusTypesToColor[order.status] : 'red'">{{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label>Last update:</label><p name="last-update">{{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label>Priority:</label><p name="priority" :class="priorityToColor[order.priority] ? priorityToColor[order.priority] : 'green'">{{ order.priority ? order.priority.charAt(0).toUpperCase()+ order.priority.slice(1) : "Low" }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label>Tags:</label>
                <div name="tags" id="tags-div" >
                    <p v-for="(tag, index) in order.tags" :key="tag" class="tag">{{ tags.find(t => t.id === tag).name }}<span v-if="index != order.tags.length - 1">, </span></p>
                </div>
            </div>
            <div class="full-width center-row order-info">
                <label>Supplier:</label> <p name="supplier">{{ order.supplier }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label>Creation date:</label><p name="creation">{{ order.creationDate.toDate().toLocaleString("en-GB") }}</p>
            </div>

        </div>


        <div class="center-column full-width">
            <div class="center-row">
                <span class="material-symbols-outlined">
                    shopping_cart
                </span>
                <h2>&nbsp;Items: {{ Math.floor(1000 * order.items.reduce((acc, item) => acc + parseFloat(item.price) * parseFloat(item.quantity), 0)) / 1000 }}€</h2>
            </div>
        </div>

        <div id="items-list" class="full-width">
            <div class="table">
                <div class="table-header orderview-table">
                    <p>Name</p>
                    <p>Link</p>
                    <p>Quantity</p>
                    <p>Unit Price</p>
                    <p>Total</p>
                    <p v-if="editingItems">Actions</p>
                    <p v-else>Status</p>
                </div>
                <div
                    class="table-row orderview-table"
                    v-for="(item, index) in order.items"
                    :key="index"
                >
                    <template v-if="editingItems">
                        <input type="text" v-model="item.name" required>
                        <input type="url" v-model="item.link" :pattern="supplierUrl && supplierUrl ? '^https://(www\.)?' + supplierUrl.split('https://www.').slice(-1)[0].split('https://').slice(-1)[0] + '.*' : ''" required>
                        <input type="number" v-model="item.quantity" required>
                        <input type="number" v-model="item.price" min="0.00" max="10000.00" step="0.001" required>
                        <p>{{ Math.floor(1000 * parseFloat(item.price) * parseFloat(item.quantity)) / 1000 }}€</p>
                        <div style="justify-content: center; display: flex; flex-direction: row;">
                            <span class="material-symbols-outlined clickable red" @click="deleteItem(index)" title="Delete item">
                                delete
                            </span>
                            <!-- Copy button -->
                            <span class="material-symbols-outlined clickable" @click="copyItemToClipboard(item)" title="Copy item">
                                content_copy
                            </span>
                        </div>
                    </template>
                    <template v-else>
                        <p>{{ item.name }}</p>
                        <p class="item-link"><a :href="item.link" target="_blank">{{ item.link }}</a></p>
                        <p>{{ item.quantity }}</p>
                        <p>{{ item.price }}€</p>
                        <p>{{ Math.floor(1000 * parseFloat(item.price) * parseFloat(item.quantity)) / 1000 }}€</p>
                        <div style="justify-content: center; display: flex; flex-direction: row;">
                        <button v-if="isReviewer() && getItemNextStatus(item) != 'none'"
                            v-on:click="updateItemStatus(index, getItemNextStatus(item), true)" class="alt-button">
                            Mark as {{ getItemNextStatus(item) }}
                        </button>
                        <p v-else class="order-item-status" :class="getItemStatusColor(item)">
                            {{ getItemStatus(item) }}
                        </p>
                        </div>
                    </template>
                </div>
                <div v-if="editingItems" class="full-width center-both  ">
                    <span class="material-symbols-outlined" id="add-item" v-on:click="addItem()" title="Add item">
                        add_circle
                    </span>
                    <span class="material-symbols-outlined" id="add-item" v-on:click="pasteItemFromClipboard()" title="Paste item">
                        content_paste
                    </span>
                </div>
            </div>
        </div>

        <div id="approval-buttons">
            <button class="alt-button" v-if="canEdit()" @click="toggleEditItems()">
                {{ editingItems ? "Save Items" : "Edit Items" }}
            </button>

            <button class="green"
                v-if="isAuthor() && ['draft'].includes(order.status)"
                v-on:click="publishOrder()">
                Create Order
            </button>

            <button  class="green"
                v-if="isReviewer() && ['pending', 'refused', 'pendingIR', 'refusedIR'].includes(order.status)"
                v-on:click="approvedByIR(false)">
                Approve Order
            </button>

            <div v-if="isReviewer() && ['pendingIR', 'refusedIR'].includes(order.status)" class="center-row small-gap">
                <select v-model="selectedReviewer">
                    <option v-for="reviewer in reviewers.filter(reviewer =>  isReviewRequestAllowed(reviewer.email))" :key="reviewer.id" :value="reviewer.email">{{ reviewer.email }}</option>
                </select>
                <button  class="blue"
                    v-on:click="requestReview()">
                    Send Review Request
                </button>
            </div>

            <button
                v-if="isReviewer() && ['processingOrder'].includes(order.status)"
                v-on:click="setOrderStatus('ordered')">
                Mark as ordered
            </button>

            <button
                v-if="isReviewer() && ['ordered'].includes(order.status)"
                v-on:click="setOrderStatus('received')">
                Mark as delivered
            </button>

            <button
                v-if="isReviewer() && ['received'].includes(order.status)"
                v-on:click="setOrderStatus('completed')">
                Mark as completed
            </button>

            <button  class="red"
                v-if="isReviewer() && ['pendingIR', 'processingOrder'].includes(order.status)"
                v-on:click="rejectedByIR()">
                Reject Order
            </button>

            <button class="red"
                v-if="isAuthor() && ['draft', 'pendingIR'].includes(order.status)"
                v-on:click="cancelOrder()">
                Cancel Order
            </button>

        </div>


        <div class="center-column full-width">
            <div class="center-row">
                <span class="material-symbols-outlined">
                    history
                </span>
                <h2>&nbsp;Updates</h2>
            </div>
        </div>


        <ul id="updates">
            <li v-for="update in order.updates" :key="update.date.toDate().toLocaleString('en-GB')" class="update">

                <div v-if="update.type == 'comment'" class="update-comment">
                    <!-- <div class="symbol">
                        <span class="material-symbols-outlined">{{ updateTypesToIcon[update.type] ?  updateTypesToIcon[update.type] : 'notifications' }}</span>
                    </div> -->
                    <div class="vline"></div>
                    <div class="update-comment-content">

                        <div class="update-header">
                            <!-- <h3 class="update-title">{{ updateTypesToMessage[update.type] }}&nbsp;</h3> -->
                            <p class="update-title">{{ update.author }}&nbsp;</p>
                            <p class="update-date">commented on the {{ update.date.toDate().toLocaleString('en-GB') }}</p>
                        </div>
                        <p class="update-message">{{ update.message }}</p>
                    </div>
                    <!-- <hr> -->
                </div>
                <div v-else-if="update.type == 'review-requested'" class="update-notification">
                    <div class="vline"></div>
                    <div class="symbol">
                        <span class="material-symbols-outlined">{{ updateTypesToIcon[update.type] ?  updateTypesToIcon[update.type] : 'notifications' }}</span>
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
                        <span class="material-symbols-outlined">{{ updateTypesToIcon[update.type] ?  updateTypesToIcon[update.type] : 'notifications' }}</span>
                    </div>
                    <div class="update-header">
                        <h3 class="update-title" :class="updateTypesToColor[update.type] ? updateTypesToColor[update.type] : 'red'">{{ updateTypesToMessage[update.type] }}&nbsp;</h3>
                        <p class="update-author">by {{ update.author }},&nbsp;</p>
                        <p class="update-date">{{ update.date.toDate().toLocaleString('en-GB') }}</p>
                    </div>
                </div>
            </li>
        </ul>
    </div>
    <div id="comment-div" class="full-width center-column">
        <textarea name="comment-textarea" id="comment-textarea" class="full-width"></textarea>
        <span class="material-symbols-outlined" v-on:click="addComment()">
            send
        </span>
    </div>
</template>


<style>

.order-info label {
    min-width: 10rem;
}
.order-info p {
    margin: 0;
}

#order-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
}

#order-header * {
    margin-top: 0;
}


@media (max-width: 768px) {

    #order-header {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    #order-header h2 {
        margin: 1rem 0 0 0;
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

.orderview-table {
    border: 3px solid transparent !important;
    grid-template-columns: 2fr 3fr 6rem 7rem 6rem 13rem;
    /* grid-template-columns: 2fr 3fr 6rem 7rem 6rem 4rem 5rem 8rem; */
    cursor: initial !important;
}

@media (max-width: 768px) {
    .orderview-table {
        width: 768px;
    }
}

.edit-buttons {
    justify-content: center;
}

.review-buttons {
    justify-content: center;
}

.material-symbols-outlined.green {
    color: green;
}

.material-symbols-outlined.red {
    color: red;
}

#pi-review-div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
}

#approval-buttons {
    display: flex;
    width: 100%;
    /* justify-content: space-between; */
    gap: 2rem;
    padding-top: 2rem;
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
    flex-direction: row;
    align-items: flex-end;
    width: 100%;
    overflow: hidden;
}

#comment-div textarea {
    width: 100%;
    height: 5rem;
    border: 1px solid var(--color-text-primary);
}

#comment-div textarea:focus {
    border: var(--border-timeline) solid var(--color-text-primary);
}

#comment-div span {
    margin-left: 0.5rem;
    font-size: 2rem;
    cursor: pointer;
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
