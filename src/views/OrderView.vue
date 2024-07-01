<script>
import Return from '../components/Return.vue'
import { useDocument, useFirestore, useCurrentUser } from 'vuefire'
import { doc, updateDoc } from "firebase/firestore";


import { useRoute } from 'vue-router'

// order-creation
// - date
// - author (system)

// order-cancelled
// - date
// - author (owner or PI or IR)

// comment
// - date
// - author
// - message

// waiting-for-reply
// - date
// - author (IR or PI)

// review-ir-approved
// - date
// - author (IR)

// review-ir-refused
// - date
// - author (IR)

// review-pi-requested
// - date
// - author (IR)

// review-pi-approved
// - date
// - author (PI)

// review-pi-refused
// - date
// - author (PI)

// order-delivered
// - date
// - author (IR or PI)

// order-completed
// - date
// - author (IR or PI)

const updateTypesToMessage = {
    'order-creation': "Order Created",
    'order-cancelled': "Order Cancelled",
    'comment': "Comment",
    'waiting-for-reply': "Waiting for Reply",
    'review-ir-approved': "Approved by a Reasearch Engineer",
    'review-ir-refused': "Refused by a Reasearch Engineer",
    'review-pi-requested': "Review by a Principal Investigator requested",
    'review-pi-approved': "Approved by a Principal Investigator",
    'review-pi-refused': "Refused by a Principal Investigator",
    'order-processed': "Order Processed",
    'order-received': "Order delivered, waiting for pick up",
    'order-completed': "Order completed"
}

const statusTypesToMessage = {
    "pendingIR": "Pending Reasearch Engineer review",
    "pendingPI": "Pending Principal Investigator review",
    "refusedPI": "Refused by a Principal Investigator",
    "refusedIR": "Refused by a Reasearch Engineer",
    "processingOrder": "Processing Order",
    "ordered": "Ordered",
    "received": "Waiting for Pick Up",
    "completed": "Completed",
};

const statusTypesToColor = {
    "pendingIR": "orange",
    "pendingPI": "orange",
    "refusedPI": "red",
    "refusedIR": "red",
    "processingOrder": "blue",
    "ordered": "blue",
    "received": "blue",
    "completed": "green",
};

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
            // TODO: Add rule checks

            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            const currentUser = useCurrentUser()
            const area = document.getElementById("comment-textarea")
            const comment = area.value
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
        return {
            order, order_id, updateTypesToMessage, statusTypesToMessage, userData, statusTypesToColor
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
                <label for="supplier">Supplier:</label> <p name="supplier">{{ order.supplier }}</p>
            </div>
            <div class="full-width center-row order-info">
                <label for="creation">Creation date:</label><p name="creation">{{ order.creationDate.toDate().toLocaleString("en-GB") }}</p>
            </div>

        </div>
        <div id="items-list" class="full-width">
            <table id="items" class="full-width">
                <tr>
                    <th>Name</th>
                    <th>Link</th>
                    <th>Quantity</th>
                    <th>Price</th>
                </tr>
                <tr
                v-for="item in order.items"
                :key="item.name"
                >
                    <td>{{ item.name }}</td>
                    <td class="link"><a :href="item.link" target=”_blank” >{{ item.link }}</a></td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.price }}</td>

                </tr>
            </table>
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
                Confirm order
            </button>

            <button
                v-if="(userData && (userData.isPI || userData.isIR)) && ['ordered'].includes(order.status)"
                v-on:click="setAsDelivered()">
                Confirm delivery
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
                <h2>Updates</h2>
            </div>
        </div>
        <ul>
            <li v-for="update in order.updates" :key="update.date.toDate().toLocaleString('en-GB')" class="update">
                <div class="update-header">
                    <h3 class="update-title">{{ updateTypesToMessage[update.type] }}</h3>
                    <p class="update-author">&nbsp;by {{ update.author }}</p>
                    <p class="update-date">, {{ update.date.toDate().toLocaleString('en-GB') }}</p>
                </div>
                <p class="update-message">{{ update.message }}</p>
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
    width: 10rem;
}
.order-info p {
    margin: 0;
}

#order-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
}

.update {
    margin-top: 2rem;
}

.update-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
}

.update-title {
    color: var(--color-text-secondary);
    font-weight: bold;
    margin: 0;
}

.update-author {
    color: var(--color-text-secondary);
    font-style: italic;
    font-size: 0.8rem;
    margin: 0;
}

.update-date{
    font-size: 0.8rem;
    font-style: italic;
    margin: 0;
}

.update-message {
    font-size: 1rem;
    margin: 0;
    font-weight: 300;
}

#comment-div {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    width: 100%;
}

#comment-div textarea {
    margin-top: 2rem;
    width: 100%;
}

#comment-div span {
    margin-left: 0.5rem;
    font-size: 2rem;
    cursor: pointer;
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
    margin-top: 2rem;
}



#items td:nth-child(1) {
    white-space: nowrap;

}

#items td:nth-child(2) {
    display: table;
    table-layout: fixed;
    width: 100%;
    padding: 0.5em 0;
    border: 0;

}

#items td:nth-child(2) a {
    display: block;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}

#items-list {
    overflow-x: auto;
    margin-top: 2rem;
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
