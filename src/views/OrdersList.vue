<script>
import { ref, computed, watch } from "vue";

import { useDocument, useCollection, useFirestore, useCurrentUser } from "vuefire";
import { doc, collection, where, query, orderBy, limit } from "firebase/firestore";

import Orders from "../components/Orders.vue";

import { statusTypesToMessage, statusTypesToColor, completedStatuses } from '../utils/definitions.js'

import Multiselect from 'vue-multiselect'

export default {
  methods: {
    createNewOrder() {
      this.$router.push("/create");
    },
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
            where("status", "in", selectedStatuses.value.map(status => status.title)),
            orderBy(sortBy.value, "desc"),
            limit(limitVal.value)
          );
        } else {
          // Add draft status to the query
          const statusesToInclude = selectedStatuses.value.map(status => status.title);
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
      console.log(filteredOrders);
      if (filteredOrders.length  == 0) {
        loadMoreOrders();
      }
      return filteredOrders;
    });

    return {
      userData, completedStatuses, showCompleted, orders, sortedByCreationDate,
      statusTypesToMessage, statusTypesToColor, searchQuery, filteredOrders,
      selectedStatuses, statuses, sortBy, limitVal, loadMoreOrders
    };
  },
  components: {
    Orders,
    Multiselect,
  },
};
</script>

<template>
  <div id="top-controls" class="medium-gap">
    <button class="alt-button" id="new-order" v-on:click="createNewOrder()">
      New order
    </button>

    <input id="orders-search-filter" type="text" v-model="searchQuery" placeholder="Search orders..." />

    <div id="orders-status-filter">
      <multiselect v-model="selectedStatuses"  :options="statuses" :multiple="true" label="desc"
        track-by="title" :close-on-select="false" :clear-on-select="false" select-label="Click to select" deselect-label="Click to deselect" placeholder="Select statuses">

        <template #option="props">
          <span :class="statusTypesToColor[props.option.title]">{{ props.option.desc }}</span>
        </template>
        <template #selection="{ isOpen }">
          <span class="multiselect__single"
              v-if="selectedStatuses.length"
              v-show="!isOpen">Order status: {{ selectedStatuses.length }} selected</span>
        </template>
      </multiselect>
    </div>

    <select id="orders-sort" v-model="sortBy">
      <option value="creationDate">Creation Date</option>
      <option value="lastUpdate">Last Update</option>
    </select>
  </div>
  <div id="orders-list">
    <Orders :orders="filteredOrders" :showCompleted="showCompleted" />
    <button v-if="orders.length === limitVal" @click="loadMoreOrders" class="alt-button">
      View More
    </button>
  </div>
</template>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

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


.multiselect {
  background-color: var(--bg-light);
  border-radius: 8px;
  border-color: var(--border);
  box-shadow: 0px var(--s-shade) var(--s-shade) hsl(0, 0%, 0%, 0.15), 0px var(--b-shade) var(--b-shade) hsl(0, 0%, 0%, 0.3);

  /* box-shadow: 0px var(--s-shade) var(--s-shade) #00000030, 0px var(--b-shade) var(--b-shade) #00000015; */
}

.multiselect__tags {
  background-color: var(--bg-light);
  border-radius: 8px;
  border-color: var(--border);
}

.multiselect__tags:hover, .multiselect__tags:focus {
  border-color: var(--border-hover);
  cursor: pointer;
}

.multiselect__tags > input {
  background-color: var(--bg-light);
  font-size: 1rem;
}

.multiselect__single {
  font-size: 1rem;
  background-color: var(--bg-light);
}

.multiselect__option {
  background-color: var(--color-primary) !important;
}

/* Set background of selected to black */
.multiselect__option--selected {
  background-color: var(--color-tertiary) !important;
}
/* Set placeholder text size */
.multiselect__placeholder {
  font-size: 1rem;
}

.multiselect__option {
  font-size:1rem;
}

/* .multiselect__option--highlight {
  background-color: var(--color-secondary) !important;
} */

.multiselect__tag {
  background-color: var(--color-secondary) !important;
  color: var(--color-text-primary) !important;
  border-radius: 8px;
  padding: 0.2rem 0.5rem;
}

.multiselect__tag-icon {
  color: var(--color-text-primary) !important;
}

/* p, p {
  border: 1px solid var(--color-primary);
} */

</style>
