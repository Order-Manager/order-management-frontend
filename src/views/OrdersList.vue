<script>
import { ref } from 'vue'

import { useCollection, useFirestore, useCurrentUser } from 'vuefire'
import { collection, where, query } from "firebase/firestore"


export default {
    methods: {
        createNewOrder() {
            this.$router.push('/create')
        },
        goToOrder(id) {
            this.$router.push(`/view/${id}`)
        }
    },
    setup() {
        const db = useFirestore()
        const currentUser = useCurrentUser();
        // const orders = useCollection(collection(db, 'orders'))

        const orders = useCollection(
            query( // you can pass a query into useCollection
                collection(db, "orders"), // go to the sessions collection
                where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
            ),
        );

        const showCompleted = ref(false)
        return { showCompleted, orders }
    }
}
</script>

<template>
    <div>
        <div id="top-controls">
            <button id="completed-visibility" v-on:click="showCompleted = !showCompleted">
                {{ showCompleted ? 'Hide' : 'Show' }} completed
            </button>
            <button class="alt-button" id="new-order" v-on:click="createNewOrder()">New order</button>
        </div>
        <div id="orders-list">
            <table id="orders">
                <tr>
                    <th>Title</th>
                    <th>Requested by</th>
                    <th>Creation Date</th>
                    <th>Last Update</th>
                    <th>Supplier</th>
                    <th>Status</th>
                </tr>
                <tr v-on:click="goToOrder(order.id)" v-show="order.status != 'completed' || showCompleted" v-for="order in orders" :key="order.creation_date">
                    <td>{{ order.title }}</td>
                    <td>{{ order.requestedBy }}</td>
                    <td>{{ order.creationDate.toDate() }}</td>
                    <td>{{ order.lastUpdate.toDate() }}</td>
                    <td>{{ order.supplier }}</td>
                    <td>{{ order.status }}</td>
                </tr>
            </table>
        </div>
    </div>
</template>


<style>
    #top-controls {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1em;
    }

#orders {
        width: 100%;
        border-collapse: collapse;
    }

    #orders th {
        background-color: var(--color-primary);
        color: var(--color-text-primary);
        padding: 0.5em 1em;
    }


    #orders th:first-child {
        border-top-left-radius: 0.5em;
    }

    #orders th:last-child {
        border-top-right-radius: 0.5em;
    }

    #orders td {
        padding: 0.5em 1em;
        border-bottom: 1px solid var(--color-secondary);
        text-align: center;
        color: var(--color-text-secondary);
    }

    #orders tr {
        cursor: pointer;
        background-color: var(--color-tertiary);
    }


    #orders tr:hover {
        background-color: var(--color-secondary)!important;
    }

    #orders tr:hover td {
        color: var(--color-text-secondary)!important;
    }
</style>
