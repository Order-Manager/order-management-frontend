<script>
import StatusBadge from './StatusBadge.vue'
import RelativeTime from './RelativeTime.vue'
import { formatEuros, orderTotal } from '../utils/dates.js'


export default {
    components: {
        StatusBadge, RelativeTime
    },
    methods: {
        // Clicking anywhere on a row opens the order; the title link handles keyboard, middle-click and new tabs
        openFromRow(id, event) {
            if (event.target.closest('a')) return;
            this.$router.push(`/view/${id}`);
        },
        itemCount(order) {
            const count = (order.items || []).length;
            return `${count} item${count === 1 ? '' : 's'}`;
        },
        formatEuros, orderTotal,
    },
    props: {
        orders: Array,
        caption: String,
        // Students only see their own orders, so the column would always say the same thing
        showRequester: {
            type: Boolean,
            default: true
        },
        // The date shown is the one the list is sorted by
        dateField: {
            type: String,
            default: 'creationDate'
        },
    }
}

</script>

<template>
    <div class="table-scroll">
        <table class="data-table orderlist-table">
            <caption class="visually-hidden">{{ caption }}</caption>
            <!-- Fixed widths so stacked tables (one per stage) line up -->
            <colgroup>
                <col class="w-status" />
                <col />
                <col v-if="showRequester" class="w-requested" />
                <col class="w-total" />
                <col class="w-date" />
                <col class="w-supplier" />
            </colgroup>
            <thead>
                <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Order</th>
                    <th v-if="showRequester" scope="col">Requested by</th>
                    <th scope="col">Total</th>
                    <th scope="col">{{ dateField === 'lastUpdate' ? 'Last update' : 'Created' }}</th>
                    <th scope="col">Supplier</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    class="link-row"
                    v-for="order in orders"
                    :key="order.id"
                    @click="openFromRow(order.id, $event)"
                >
                    <td class="col-status"><StatusBadge :status="order.status" /></td>
                    <td class="col-title">
                        <router-link :to="`/view/${order.id}`">{{ order.title || '(Untitled order)' }}</router-link>
                        <span class="item-count">{{ itemCount(order) }}</span>
                    </td>
                    <!-- Long emails break after the @ rather than mid-word -->
                    <td v-if="showRequester" class="col-requested">{{ (order.requestedBy || '').split('@')[0] }}<wbr>@{{ (order.requestedBy || '').split('@')[1] }}</td>
                    <td class="col-total">{{ formatEuros(orderTotal(order.items)) }}</td>
                    <td class="col-date" :data-label="dateField === 'lastUpdate' ? 'Updated' : 'Created'"><RelativeTime :value="order[dateField]" /></td>
                    <td class="col-supplier">{{ order.supplier }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>


<style>

.orderlist-table {
    table-layout: fixed;
}

.orderlist-table .w-status { width: 17%; }
.orderlist-table .w-requested { width: 18%; }
.orderlist-table .w-total { width: 9%; }
.orderlist-table .w-date { width: 13%; }
.orderlist-table .w-supplier { width: 12%; }

.orderlist-table .col-title {
    text-align: left;
}

.orderlist-table .col-title a {
    color: var(--text);
}

.orderlist-table .item-count {
    display: block;
    font-size: var(--font-sm);
    color: var(--text-muted);
}

.orderlist-table .col-total {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

/* Phones and tablets: each order becomes a card, title first */
@media (max-width: 59.99rem) {
    .orderlist-table thead, .orderlist-table colgroup {
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
            "status date"
            "requested requested"
            "supplier total";
        gap: var(--space-2) var(--space-4);
        padding: var(--space-4);
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
        font-size: var(--font-lg);
    }

    .orderlist-table .col-title .item-count {
        display: inline;
        margin-left: var(--space-2);
    }

    .orderlist-table .col-status { grid-area: status; }
    .orderlist-table .col-date { grid-area: date; text-align: right; }
    .orderlist-table .col-requested { grid-area: requested; overflow-wrap: anywhere; color: var(--text-muted); }
    .orderlist-table .col-supplier { grid-area: supplier; overflow-wrap: anywhere; }
    .orderlist-table .col-total { grid-area: total; text-align: right; color: var(--text); }
}
</style>
