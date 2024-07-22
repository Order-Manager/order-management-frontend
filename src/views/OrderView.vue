<script>
import Return from '../components/Return.vue'
import { useDocument, useFirestore, useCurrentUser, useCollection } from 'vuefire'
import { doc, updateDoc, collection } from "firebase/firestore";


import { useRoute } from 'vue-router'

import { updateTypesToMessage, statusTypesToMessage, statusTypesToColor, updateTypesToColor, updateTypesToIcon, priorityToColor } from '../utils/definitions.js'

export default {
    components: {
        Return
    },
    methods: {
        goToOrder(date) {
            this.$router.push(`/view/${date}`)
        },
        approvedByIR(requiresPI) {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()

            updateDoc(orderRef, {
                "status": "approvedIR",
                "reviewIR": true,
                "reviewIRBy": currentUser.value.email,
                "requiresReviewPI": requiresPI
            })
            // console.log(orderRef)
        },
        rejectedByIR() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            updateDoc(orderRef, {
                "status": "refusedIR",
                "reviewIR": false,
                "reviewIRBy": currentUser.value.email,
                "requiresReviewPI": false,
            })
            // console.log(orderRef)
        },
        approvedByPI() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            updateDoc(orderRef, {
                "status": "approvedPI",
                "reviewPI": true,
                "reviewPIBy": currentUser.value.email,
            })
            // console.log(orderRef)
        },
        rejectedByPI() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            updateDoc(orderRef, {
                "status": "refusedPI",
                "reviewPI": false,
                "reviewPIBy": currentUser.value.email,
            })
            // console.log(orderRef)
        },
        setAsOrdered() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            updateDoc(orderRef, {
                "status": "ordered",
                "orderedBy": currentUser.value.email
            })
            // console.log(orderRef)
        },
        setAsDelivered() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            updateDoc(orderRef, {
                "status": "received",
                "receivedBy": currentUser.value.email
            })
            // console.log(orderRef)
        },

        setAsCompleted() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            updateDoc(orderRef, {
                "status": "completed",
                "completedBy": currentUser.value.email
            })
            // console.log(orderRef)
        },
        addComment() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            const area = document.getElementById("comment-textarea")
            const comment = area.value

            // TODO: Add rule checks
            // TODO: Throw error if comment is empty or too long
            if (comment.length == 0 || comment.length > 1000) return;
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
        }
    },
    props: {
        order_id: String,
    },
    setup() {
        const db = useFirestore()
        const currentUser = useCurrentUser()
        const route = useRoute()
        const order_id = route.params.id
        const order = useDocument(doc(db, 'orders', order_id))
        const userData = useDocument(doc(db, 'admins', currentUser.value.uid))
        const tags = useCollection(collection(db, 'tags'))

        console.log(tags)

        return {
            order, order_id, updateTypesToMessage, statusTypesToMessage, userData, statusTypesToColor, updateTypesToColor, updateTypesToIcon, priorityToColor, tags
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
                <label for="status">Status:</label><p name="status" :class="statusTypesToColor[order.status] ? statusTypesToColor[order.status] : 'red'">{{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label for="last-update">Last update:</label><p name="last-update">{{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label for="priority">Priority:</label><p name="priority" :class="priorityToColor[order.priority] ? priorityToColor[order.priority] : 'green'">{{ order.priority ? order.priority.charAt(0).toUpperCase()+ order.priority.slice(1) : "Low" }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label for="tags">Tags:</label>
                <div name="tags" id="tags-div" >
                    <p v-for="(tag, index) in order.tags" :key="tag" class="tag">{{ tags.find(t => t.id === tag).name }}<span v-if="index != order.tags.length - 1">, </span></p>
                </div>
            </div>
            <div class="full-width center-row order-info">
                <label for="supplier">Supplier:</label> <p name="supplier">{{ order.supplier }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label for="creation">Creation date:</label><p name="creation">{{ order.creationDate.toDate().toLocaleString("en-GB") }}</p>
            </div>

        </div>


        <div class="center-column full-width">
            <div class="center-row">
                <span class="material-symbols-outlined">
                    shopping_cart
                </span>
                <h2>&nbsp;Items: {{ 0.01*Math.floor(100 * order.items.reduce((acc, item) => acc + parseFloat(item.price) * parseFloat(item.quantity), 0)) }}€</h2>
            </div>
        </div>

        <div id="items-list" class="full-width">
            <div class="table">
                <div class="table-header orderview-table">
                    <th>Name</th>
                    <th>Link</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Price</th>
                </div>
                <div
                    class="table-row orderview-table"
                    v-for="item in order.items"
                    :key="item.name"
                >
                    <p>{{ item.name }}</p>
                    <p class="item-link"><a :href="item.link" target=”_blank” >{{ item.link }}</a></p>
                    <p>{{ item.quantity }}</p>
                    <p>{{ item.price }}€</p>
                    <p>{{ 0.01*Math.floor(100 * parseFloat(item.price) * parseFloat(item.quantity)) }}€</p>

                </div>
            </div>
        </div>


        <div id="approval-buttons">
            <button
                v-if="(userData && userData.isIR) && ['pendingIR', 'refusedIR'].includes(order.status)"
                v-on:click="approvedByIR(false)">
                Approve Order (RE)
            </button>


            <button
                v-if="(userData && userData.isIR) && ['pendingIR', 'refusedIR'].includes(order.status)"
                v-on:click="approvedByIR(true)">
                Approve Order (RE) but Request PI Review
            </button>

            <button
                v-if="(userData && userData.isIR) && ['pendingIR'].includes(order.status)"
                v-on:click="rejectedByIR()">
                Reject Order (RE)
            </button>

            <button
                v-if="(userData && userData.isPI) && ['pendingPI', 'refusedPI'].includes(order.status)"
                v-on:click="approvedByPI()">
                Approve Order (PI)
            </button>

            <button
                v-if="(userData && userData.isPI) && ['pendingPI'].includes(order.status)"
                v-on:click="rejectedByPI()">
                Reject Order (PI)
            </button>

            <button
                v-if="(userData && (userData.isPI || userData.isIR)) && ['processingOrder'].includes(order.status)"
                v-on:click="setAsOrdered()">
                Mark as ordered
            </button>

            <button
                v-if="(userData && (userData.isPI || userData.isIR)) && ['ordered'].includes(order.status)"
                v-on:click="setAsDelivered()">
                Mark as delivered
            </button>

            <button
                v-if="(userData && (userData.isPI || userData.isIR)) && ['received'].includes(order.status)"
                v-on:click="setAsCompleted()">
                Mark as completed
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
                    <div class="vline"></div>
                    <!-- <div class="symbol">
                        <span class="material-symbols-outlined">{{ updateTypesToIcon[update.type] ?  updateTypesToIcon[update.type] : 'notifications' }}</span>
                    </div> -->
                    <div class="update-comment-outer-border"></div>
                    <div class="update-header">
                        <!-- <h3 class="update-title">{{ updateTypesToMessage[update.type] }}&nbsp;</h3> -->
                        <p class="update-title">{{ update.author }}&nbsp;</p>
                        <p class="update-date">commented on the {{ update.date.toDate().toLocaleString('en-GB') }}</p>
                    </div>
                    <!-- <hr> -->
                    <p class="update-message">{{ update.message }}</p>
                </div>

                <div v-if="update.type != 'comment'" class="update-notification">
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

#tags-div {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
}

.orderview-table {
    border: 3px solid transparent !important;
    grid-template-columns: 2fr 3fr 6rem 7rem 8rem;
    cursor: initial !important;
}

@media (max-width: 768px) {
    .orderview-table {
        width: 768px;
    }
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
    justify-content: space-between;
}

#approval-buttons button {
    margin-top: 2rem;
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
    border: 1.5px solid var(--color-text-primary);
    z-index: 0;
}

.symbol {
    position: absolute;
    top: calc(50% - 1rem);
    left: 0.4rem;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 3px solid var(--color-secondary);
    background-color: var(--color-text-primary);
    display: flex;
    justify-content: center;
    align-items: center;
}

.symbol > span {
    color: var(--color-tertiary);
    font-size: 1.5rem;
}

.update-notification {
    padding-left: 3rem;
}

.update-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
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

.update-comment-outer-border {
    position: absolute;
    top: calc(1rem - 3px);
    left: calc(0px - 3px);
    right: calc(0px - 3px);
    bottom: calc(1rem - 3px);
    border: 3px solid var(--color-secondary);
    border-radius: 0.5rem;
}

.update-comment {
    padding: 0 !important;
    background-color: var(--color-secondary);
}

.update-comment {
    border: 3px solid var(--color-text-primary);
    border-radius: 0.5rem;
}

.update-comment > hr{
    /* background-color: var(--color-primary); */
    border: 1px solid var(--color-tertiary);
    border-radius: 0.5rem;
    margin: 0;
}

.update-comment > .update-message {
    position: relative;
    padding: 0.75rem;
    background-color: var(--color-secondary);
    border-radius: 0.5rem;
    white-space: pre-wrap;
}

.update-comment > .update-header {
    position: relative;
    padding: 0.75rem;
    background-color: var(--color-text-primary);
}

.update-comment > .update-header > * {
    color: var(--color-tertiary);
}

#comment-div {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    width: 100%;
}

#comment-div textarea {
    width: 100%;
    height: 5rem;
    border: 1px solid var(--color-text-primary);
}

#comment-div textarea:focus {
    border: 3px solid var(--color-text-primary);
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
