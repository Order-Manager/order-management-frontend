<script>
import { statusTypesToMessage, statusTypesToColor, completedStatuses } from '../utils/definitions.js'


export default {
    methods: {
        // Clicking anywhere on a row opens the order; the title link handles keyboard, middle-click and new tabs
        openFromRow(id, event) {
            if (event.target.closest('a')) return;
            this.$router.push(`/view/${id}`);
        },
    },
    setup() {

        return {
            completedStatuses,
            statusTypesToMessage,
            statusTypesToColor,
        }
    },
    props: {
        orders: Array,
        showCompleted: Boolean
    }
}

</script>

<template>
    <div class="table-scroll" id="orders">
        <table class="data-table orderlist-table">
            <caption class="visually-hidden">Orders, newest first</caption>
            <thead>
                <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Title</th>
                    <th scope="col">Requested by</th>
                    <th scope="col">Last update</th>
                    <th scope="col">Created</th>
                    <th scope="col">Supplier</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    class="link-row"
                    v-for="order in orders"
                    v-show="!completedStatuses.includes(order.status) || showCompleted"
                    :key="order.id"
                    @click="openFromRow(order.id, $event)"
                >
                    <td :class="statusTypesToColor[order.status] ? statusTypesToColor[order.status] : 'red'">{{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</td>
                    <td><router-link :to="`/view/${order.id}`">{{ order.title }}</router-link></td>
                    <td>{{ order.requestedBy }}</td>
                    <td>{{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</td>
                    <td>{{ order.creationDate.toDate().toLocaleString("en-GB") }}</td>
                    <td>{{ order.supplier }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>


<style>

@media (max-width: 768px) {
    .orderlist-table {
        min-width: 768px;
    }
}
</style>
