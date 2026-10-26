<script>
import { ref, computed, watch } from "vue";

import { useDocument, useCollection, useFirestore, useCurrentUser } from "vuefire";
import { doc, collection, where, query, orderBy, limit } from "firebase/firestore";

import Orders from "../components/Orders.vue";

import { statusTypesToMessage } from '../utils/definitions.js'

const PAGE_SIZE = 15;

// Admins' "Needs action" view is grouped by what they have to do next
const STAGES = [
  { status: "pendingIR", title: "To review" },
  { status: "processingOrder", title: "To order" },
  { status: "ordered", title: "Waiting for delivery" },
  { status: "received", title: "Ready for pick-up" },
];

export default {
  setup() {
    const db = useFirestore();
    const currentUser = useCurrentUser();

    const userData = useDocument(doc(db, 'admins', currentUser.value.uid))
    const isAdmin = computed(() => !!(userData.value && userData.value.isIR));

    const views = computed(() => [
      isAdmin.value
        ? { id: "active", label: "Needs action", statuses: STAGES.map(stage => stage.status), paged: false }
        : { id: "active", label: "Active", statuses: ["draft", "pendingIR", "processingOrder", "ordered", "received"], paged: false },
      { id: "completed", label: "Completed", statuses: ["completed"], paged: true },
      { id: "closed", label: "Rejected & cancelled", statuses: ["refusedIR", "cancelled"], paged: true },
      { id: "all", label: "All", statuses: ["draft", "pendingIR", "processingOrder", "ordered", "received", "completed", "refusedIR", "cancelled"], paged: true },
      // Archived orders, whatever their status, live only here
      { id: "archived", label: "Archived", statuses: null, archived: true, paged: true },
    ]);
    const viewId = ref("active");
    const view = computed(() => views.value.find(v => v.id === viewId.value));

    const sortBy = ref("creationDate");
    const limitVal = ref(PAGE_SIZE);
    const searchQuery = ref("");

    // A new view or sort starts from the first page again
    watch([viewId, sortBy], () => limitVal.value = PAGE_SIZE);

    const orders = useCollection(
      computed(() => {
        const constraints = [where("archived", "==", !!view.value.archived)];
        if (view.value.statuses) constraints.push(where("status", "in", view.value.statuses));
        if (!isAdmin.value) constraints.unshift(where("requestedBy", "==", currentUser.value.email));
        constraints.push(orderBy(sortBy.value, "desc"));
        // Active orders are few; history is paged
        if (view.value.paged) constraints.push(limit(limitVal.value));
        return query(collection(db, "orders"), ...constraints);
      })
    );

    const loading = computed(() => orders.pending.value);
    const hasMore = computed(() => view.value.paged && orders.value.length === limitVal.value);
    const loadMoreOrders = () => {
      limitVal.value += PAGE_SIZE;
    };

    // Search only looks at the loaded orders; "Load more" widens it on request
    const filteredOrders = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      if (!q) return orders.value;
      return orders.value.filter(order =>
        (order.title || "").toLowerCase().includes(q) ||
        (order.requestedBy || "").toLowerCase().includes(q) ||
        (order.supplier || "").toLowerCase().includes(q) ||
        (order.items || []).some(item => (item.name || "").toLowerCase().includes(q)) ||
        (statusTypesToMessage[order.status] || "").toLowerCase().includes(q)
      );
    });

    const groups = computed(() => {
      if (!(isAdmin.value && viewId.value === "active")) {
        return [{ title: null, orders: filteredOrders.value }];
      }
      return STAGES
        .map(stage => ({ title: stage.title, orders: filteredOrders.value.filter(order => order.status === stage.status) }))
        .filter(group => group.orders.length > 0);
    });

    const emptyMessage = computed(() => {
      if (searchQuery.value.trim()) return `No orders match “${searchQuery.value.trim()}”${hasMore.value ? " among the loaded ones" : ""}.`;
      if (viewId.value === "active") return isAdmin.value ? "Nothing needs your attention right now." : "You have no orders in progress.";
      return "No orders here yet.";
    });

    return {
      isAdmin, views, viewId, orders, loading, sortBy, searchQuery, groups, filteredOrders,
      hasMore, loadMoreOrders, emptyMessage
    };
  },
  components: {
    Orders,
  },
};
</script>

<template>
  <h1 class="visually-hidden">Orders</h1>
  <div id="top-controls">
    <router-link class="button-link primary" id="new-order" to="/create">New order</router-link>

    <label for="orders-search-filter" class="visually-hidden">Search orders</label>
    <input id="orders-search-filter" type="search" enterkeyhint="search" v-model="searchQuery" placeholder="Search orders..." />

    <label for="orders-sort" class="visually-hidden">Sort by</label>
    <select id="orders-sort" v-model="sortBy">
      <option value="creationDate">Newest first</option>
      <option value="lastUpdate">Recently updated</option>
    </select>
  </div>

  <fieldset id="view-chips">
    <legend class="visually-hidden">Show</legend>
    <label v-for="option in views" :key="option.id" class="chip">
      <input type="radio" name="orders-view" class="visually-hidden" :value="option.id" v-model="viewId" />
      <span class="material-symbols-outlined" aria-hidden="true" v-if="viewId === option.id">check</span>
      {{ option.label }}
    </label>
  </fieldset>

  <div id="orders-list">
    <p v-if="loading && orders.length === 0" role="status">Loading orders…</p>

    <template v-else-if="filteredOrders.length">
      <section v-for="group in groups" :key="group.title || 'all'" class="orders-group" :aria-labelledby="group.title ? `group-${group.title}` : null">
        <h2 v-if="group.title" :id="`group-${group.title}`" class="group-title">
          {{ group.title }} <span class="group-count">{{ group.orders.length }}</span>
        </h2>
        <Orders :orders="group.orders" :showRequester="isAdmin" :dateField="sortBy" :caption="group.title || views.find(v => v.id === viewId).label" />
      </section>
    </template>

    <div v-else class="empty-state" role="status">
      <p>{{ emptyMessage }}</p>
      <router-link v-if="!isAdmin && viewId === 'active' && !searchQuery" class="button-link primary" to="/create">Create an order</router-link>
    </div>

    <button v-if="hasMore" type="button" @click="loadMoreOrders">Load more orders</button>
  </div>
</template>

<style>

#top-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

#orders-search-filter {
  flex: 1 1 12rem;
  min-width: 0;
}

#orders-sort {
  flex: 0 1 14rem;
  min-width: 0;
}

#view-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0 0 var(--space-5) 0;
  padding: 0;
  border: none;
}

#view-chips .chip {
  font-size: var(--font-md);
  cursor: pointer;
}

#view-chips .chip:has(input:focus-visible) {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

#view-chips .chip .material-symbols-outlined {
  font-size: 1.1rem;
}

#orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  align-items: stretch;
}

#orders-list > button {
  align-self: center;
}

.group-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-3) 0;
  font-size: var(--font-lg);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  text-align: center;
}

.empty-state p {
  margin: 0;
}

@media (max-width: 47.99rem) {
  #orders-sort {
    flex: 1 1 10rem;
  }
}

</style>
