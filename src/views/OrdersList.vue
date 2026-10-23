<script>
import { ref, computed, watch } from "vue";

import { useDocument, useCollection, useFirestore, useCurrentUser } from "vuefire";
import { doc, collection, where, query, orderBy, limit } from "firebase/firestore";

import Orders from "../components/Orders.vue";

import { statusTypesToMessage, statusTypesToColor, completedStatuses } from '../utils/definitions.js'


export default {
  methods: {
    // loadMoreOrders() {
    //   if (this.orders.length === this.limitVal) {
    //     this.limitVal += 15;
    //   }
    // },
  },
  setup() {
    const db = useFirestore();
    const currentUser = useCurrentUser();

    const userData = useDocument(doc(db, 'admins', currentUser.value.uid))

    const sortBy = ref("creationDate");
    const limitVal = ref(15); // Pagination limit
    const sortedByCreationDate = ref(false);
    const showCompleted = ref(true);
    const searchQuery = ref("");
    const getInitialStatuses = () => {
      if (userData.value && userData.value.isIR) {
        return [
          { title: "received", desc: "Waiting for Pick Up" },
          { title: "ordered", desc: "Ordered" },
          { title: "processingOrder", desc: "Processing Order" },
          { title: "pendingIR", desc: "Pending review" },
        ]
      } else {
        return [
          { title: "received", desc: "Waiting for Pick Up" },
          { title: "ordered", desc: "Ordered" },
          { title: "processingOrder", desc: "Processing Order" },
          { title: "pendingIR", desc: "Pending review" },
          { title: "draft", desc: "Draft" },
        ]
      }
    };
    const selectedStatuses = ref(getInitialStatuses());

    watch(() => userData.value, () => selectedStatuses.value = getInitialStatuses(), { immediate: false });

    const selectedStatusTitles = computed({
      get: () => selectedStatuses.value.map(status => status.title),
      set: (titles) => selectedStatuses.value = statuses.value.filter(status => titles.includes(status.title)),
    });

    const statuses = ref([
      { title: "completed", desc: "Order Completed" },
      { title: "received", desc: "Waiting for Pick Up" },
      { title: "ordered", desc: "Ordered" },
      { title: "processingOrder", desc: "Processing Order" },
      { title: "pendingIR", desc: "Pending review" },
      { title: "draft", desc: "Draft" },
      { title: "refusedIR", desc: "Order Rejected" },
      { title: "cancelled", desc: "Order Cancelled" },
    ]);


    const orders = useCollection(
      computed(() => {
        if (userData.value && userData.value.isIR) {
          return query(
            collection(db, "orders"),
            where("status", "in", selectedStatusTitles.value.length ? selectedStatusTitles.value : ["none"]),
            orderBy(sortBy.value, "desc"),
            limit(limitVal.value)
          );
        } else {
          // Add draft status to the query
          const statusesToInclude = selectedStatusTitles.value.length ? selectedStatusTitles.value : ["none"];
          return query(
            collection(db, "orders"),
            where("requestedBy", "==", currentUser.value.email),
            where("status", "in", statusesToInclude),
            orderBy(sortBy.value, "desc"),
            limit(limitVal.value)
          );
        }
      })
    );

    const loadMoreOrders = () => {
      if (orders.value.length === limitVal.value) {
        limitVal.value += 15;
      }
    };

    const filteredOrders = computed(() => {
      // console.log(orders.value);
      const filteredByStatus = orders.value;//.filter(order => selectedStatuses.value.map(status => status.title).includes(order.status));
      if (!searchQuery.value) return filteredByStatus;
      const filteredOrders = filteredByStatus.filter(order => {
        const query = searchQuery.value.toLowerCase();
        return (
          order.title.toLowerCase().includes(query) ||
          order.requestedBy.toLowerCase().includes(query) ||
          order.supplier.toLowerCase().includes(query) ||
          order.items.filter(el => el.name.toLowerCase().includes(query)).length > 0 ||
          statusTypesToMessage[order.status].toLowerCase().includes(query)
        );
      });
      if (filteredOrders.length  == 0) {
        loadMoreOrders();
      }
      return filteredOrders;
    });

    return {
      userData, completedStatuses, showCompleted, orders, sortedByCreationDate,
      statusTypesToMessage, statusTypesToColor, searchQuery, filteredOrders,
      selectedStatuses, selectedStatusTitles, statuses, sortBy, limitVal, loadMoreOrders
    };
  },
  components: {
    Orders,
  },
};
</script>

<template>
  <h1 class="visually-hidden">Orders</h1>
  <div id="top-controls" class="medium-gap">
    <router-link class="button-link" id="new-order" to="/create">New order</router-link>

    <label for="orders-search-filter" class="visually-hidden">Search orders</label>
    <input id="orders-search-filter" type="search" v-model="searchQuery" placeholder="Search orders..." />

    <details id="orders-status-filter">
      <summary>Status: {{ selectedStatuses.length }} selected</summary>
      <fieldset>
        <legend class="visually-hidden">Show orders with these statuses</legend>
        <label v-for="status in statuses" :key="status.title" class="status-option">
          <input type="checkbox" :value="status.title" v-model="selectedStatusTitles" />
          <span :class="statusTypesToColor[status.title]">{{ status.desc }}</span>
        </label>
      </fieldset>
    </details>

    <label for="orders-sort" class="visually-hidden">Sort by</label>
    <select id="orders-sort" v-model="sortBy">
      <option value="creationDate">Sort by creation date</option>
      <option value="lastUpdate">Sort by last update</option>
    </select>
  </div>
  <div id="orders-list">
    <Orders :orders="filteredOrders" :showCompleted="showCompleted" />
    <p v-if="orders.length === 0" role="status">No orders with these statuses.</p>
    <button v-if="orders.length === limitVal" @click="loadMoreOrders" class="alt-button">
      View more
    </button>
  </div>
</template>


<style>


.orderlist-table {
  grid-template-columns: 1fr 2fr 2fr 1fr 1fr 1fr;
}

#top-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap ;
}

#orders-list {
    padding: 0 1px;
    /* overflow-x: hidden; */
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
}

#orders {
  width: 100%;
  /* border-spacing: 0; */
  border-collapse: collapse;
  /* background-color: var(--color-secondary); */
}

#orders-search-filter {
  flex-grow: 1;
  width: 40%;
}

#orders-status-filter {
  flex-grow: 1;
  min-width: 16rem;

}

#orders-sort {
  width: 12rem;
  padding: 0.5rem;
  border-radius: 8px;
}


#orders-status-filter {
  position: relative;
  flex-grow: 1;
  min-width: 16rem;
}

#orders-status-filter summary {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0 1rem;
  box-sizing: border-box;
  border-radius: 8px;
  border: 1px solid var(--border);
  background-color: var(--bg-light);
  color: var(--text-muted);
  cursor: pointer;
}

#orders-status-filter fieldset {
  position: absolute;
  z-index: 50;
  left: 0;
  right: 0;
  margin: 0.25rem 0 0 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  border: 1px solid var(--border);
  background-color: var(--bg-light);
}

.status-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0 0.5rem;
  font-size: 1rem;
  cursor: pointer;
}

/* p, p {
  border: 1px solid var(--color-primary);
} */

</style>
