
<script>

export default {
    methods: {
        goToOrder(id) {
            console.log(this.orders);
            this.$router.push(`/view/${id}`);
        },
        sortByCreationDate() {
        const db = useFirestore();
        const currentUser = useCurrentUser();

        if (this.sortedByCreationDate) return;
        this.orders = useCollection(
            query(
            // you can pass a query into useCollection
            collection(db, "orders"), // go to the sessions collection
            where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
            orderBy("creationDate", "desc") // order by creation date descending
            )
        );
        this.sortedByCreationDate = true;
        },
        sortByLastUpdate() {
        const db = useFirestore();
        const currentUser = useCurrentUser();

        if (!this.sortedByCreationDate) return;
        this.orders = useCollection(
            query(
            // you can pass a query into useCollection
            collection(db, "orders"), // go to the sessions collection
            where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
            orderBy("lastUpdate", "desc") // order by creation date descending
            )
        );
        this.sortedByCreationDate = false;
        },
    },
    setup() {

        const completedStatuses = ["completed", "refusedPI", "refusedIR"];

        const statusTypesToMessage = {
            "pendingIR": "Pending Reasearch Engineer review",
            "pendingPI": "Pending Principal Investigator review",
            "refusedPI": "Refused by a Principal Investigator",
            "approvedPI": "Approved by a Principal Investigator",
            "refusedIR": "Refused by a Reasearch Engineer",
            "approvedIR": "Approved by a Reasearch Engineer",
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

        return {
            completedStatuses,
            statusTypesToMessage,
            statusTypesToColor,
            updateTypesToMessage
        }
    },
    props: {
        orders: Object, showCompleted: Boolean
    }
}

</script>

<template>
    <div class="table" id="orders">
        <div class="table-header orderlist-table">
            <p>Status</p>
            <p>Title</p>
            <p>Requested by</p>
            <p v-on:click="sortByLastUpdate()">Last Update</p>
            <p v-on:click="sortByCreationDate()">Creation Date</p>
            <p>Supplier</p>
        </div>
        <div
            class="table-row orderlist-table"
            v-on:click="goToOrder(order.id)"
            v-on:keyup.enter="goToOrder(order.id)"
            v-show="!completedStatuses.includes(order.status) || showCompleted"
            v-for="order in orders"
            :key="order.creationDate.toDate().toLocaleString('en-GB')"
            tabindex="0"
        >
            <p :class="statusTypesToColor[order.status] ? statusTypesToColor[order.status] : 'red'">{{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</p>
            <p>{{ order.title }}</p>
            <p>{{ order.requestedBy }}</p>
            <p>{{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</p>
            <p>{{ order.creationDate.toDate().toLocaleString("en-GB") }}</p>
            <p>{{ order.supplier }}</p>
        </div>
    </div>
</template>


<style>
</style>
