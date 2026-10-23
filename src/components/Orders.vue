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
                    <td class="col-status" :class="statusTypesToColor[order.status] ? statusTypesToColor[order.status] : 'red'">{{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</td>
                    <td class="col-title"><router-link :to="`/view/${order.id}`">{{ order.title }}</router-link></td>
                    <td class="col-requested" data-label="By">{{ order.requestedBy }}</td>
                    <td class="col-updated" data-label="Updated">{{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</td>
                    <td class="col-created" data-label="Created">{{ order.creationDate.toDate().toLocaleString("en-GB") }}</td>
                    <td class="col-supplier" data-label="Supplier">{{ order.supplier }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>


<style>

.orderlist-table .col-status {
    white-space: nowrap;
}

/* Phones and tablets: each order becomes a card, title first */
@media (max-width: 59.99rem) {
    .orderlist-table thead {
        display: block;
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
    }

    .orderlist-table, .orderlist-table tbody, .orderlist-table td {
        display: block;
    }

    .orderlist-table tbody tr.link-row {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-areas:
            "title title"
            "status updated"
            "requested requested"
            "supplier created";
        gap: 0.25rem 1rem;
        padding: 0.875rem 1rem;
    }

    .orderlist-table td {
        padding: 0;
        text-align: left;
        font-size: 0.95rem;
    }

    .orderlist-table td[data-label]::before {
        content: attr(data-label) " ";
        color: var(--text-muted);
        font-weight: 400;
    }

    .orderlist-table .col-title {
        grid-area: title;
        font-size: 1.05rem;
        color: var(--text);
        margin-bottom: 0.25rem;
    }

    .orderlist-table .col-status { grid-area: status; }
    .orderlist-table .col-updated { grid-area: updated; text-align: right; }
    .orderlist-table .col-requested { grid-area: requested; overflow-wrap: anywhere; }
    .orderlist-table .col-supplier { grid-area: supplier; overflow-wrap: anywhere; }
    .orderlist-table .col-created { grid-area: created; text-align: right; }
}
</style>
