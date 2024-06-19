<script>
import Return from '../components/Return.vue'
import { useDocument, useFirestore, useCurrentUser } from 'vuefire'
import { doc, where, query, orderBy, updateDoc } from "firebase/firestore";


import { useRoute } from 'vue-router'

// order-creation
// - date
// - author (system)

// order-cancellation
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
    'order-cancellation': "Order Cancelled",
    'comment': "Comment",
    'waiting-for-reply': "Waiting for Reply",
    'review-ir-approved': "Approved by a Reasearch Engineer",
    'review-ir-refused': "Refused by a Reasearch Engineer",
    'review-pi-requested': "Review by a Principal Investigator requested",
    'review-pi-approved': "Approved by a Principal Investigator",
    'review-pi-refused': "Refused by a Principal Investigator",
    'order-delivered': "Order delivered, waiting for pick up",
    'order-completed': "Order completed"
}

const statusTypesToMessage = {
    "pendingIR": "Pending Reasearch Engineer review",
    "pendingPI": "Pending Principal Investigator review",
    "refusedPI": "Refused by a Principal Investigator",
    "refusedIR": "Refused by a Reasearch Engineer",
    "ordered": "Ordered",
    "waiting": "Waiting for Pick Up",
    "completed": "Completed",
};

export default {
    components: {
        Return
    },
    methods: {
        goToOrder(date) {
            this.$router.push(`/view/${date}`)
        },
        approvedByIR() {
            const db = useFirestore()
            const orderRef = doc(db, 'orders', this.order_id)
            updateDoc(orderRef, {
                "reviewIR": false
            })
            // console.log(orderRef)
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
            order, order_id, updateTypesToMessage, statusTypesToMessage, userData
        }
    }
}
</script>

<template>
    <Return />

    <div v-if="order">
        <h2>{{ order.title }}</h2>
        <p>Requested by: {{ order.requestedBy }}</p>
        <p>Creation date: {{ order.creationDate.toDate().toLocaleString("en-GB") }}</p>
        <p>Last update: {{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</p>
        <p>Status: {{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</p>
        <p>Supplier: {{ order.supplier }}</p>
        <p>Items:</p>
        <ul>
            <li v-for="item in order.items" :key="item.link">
                <p>{{ item.name }}</p>
                <a :href="item.link">{{ item.link }}</a>
                <p>{{ item.quantity }}</p>
                <p>{{ item.price }}</p>
            </li>
        </ul>
        <button v-if="userData.isIR && ['pendingIR'].includes(order.status)" v-on:click="approvedByIR()">Approve Order by RE</button>
        <button v-if="userData.isPI && ['pendingPI'].includes(order.status)" v-on:click="approvedByPI()">Approve Order by PI</button>
        <p>Updates:</p>
        <ul>
            <li v-for="update in order.updates" :key="update.date.toDate().toLocaleString('en-GB')">
                <p>{{ updateTypesToMessage[update.type] }}</p>
                <p>{{ update.date.toDate().toLocaleString('en-GB') }}</p>
                <p>{{ update.author }}</p>
                <p>{{ update.message }}</p>
            </li>
        </ul>
    </div>
</template>


<style>

</style>
