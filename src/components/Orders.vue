<script>
import { useFirestore, useCollection, useCurrentUser } from "vuefire";
import { collection, query, where, orderBy } from "firebase/firestore";

import { updateTypesToMessage, statusTypesToMessage, statusTypesToColor, completedStatuses } from '../utils/definitions.js'


export default {
    methods: {
        goToOrder(id, event) {
            if (event.button === 1 || event.ctrlKey || event.metaKey) {
                window.open(`/#/view/${id}`, '_blank');
            } else {
                this.$router.push(`/view/${id}`);
            }
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

        return {
            completedStatuses,
            statusTypesToMessage,
            statusTypesToColor,
            updateTypesToMessage
        }
    },
    props: {
        orders: Array,
        showCompleted: Boolean
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
            v-on:click="goToOrder(order.id, $event)"
            v-on:auxclick="goToOrder(order.id, $event)"
            v-on:contextmenu.prevent
            v-on:keyup.enter="goToOrder(order.id, $event)"
            target="_blank"
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

@media (max-width: 768px) {
    .orderlist-table {
        width: 768px;
    }
}
</style>
