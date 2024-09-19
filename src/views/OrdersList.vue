<script>
import { ref } from "vue";

import { useDocument, useCollection, useFirestore, useCurrentUser } from "vuefire";
import { doc, collection, where, query, orderBy } from "firebase/firestore";

import Orders from "../components/Orders.vue";

import { statusTypesToMessage, statusTypesToColor, completedStatuses } from '../utils/definitions.js'


export default {
  methods: {
    createNewOrder() {
      this.$router.push("/create");
    },
    viewAll() {
      this.$router.push("/all");
    },
  },
  setup() {
    const db = useFirestore();
    const currentUser = useCurrentUser();

    const userData = useDocument(doc(db, 'admins', currentUser.value.uid))

      const orders = useCollection(
        query(
          // you can pass a query into useCollection
          collection(db, "orders"), // go to the sessions collection
          where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
          orderBy("creationDate", "desc") // order by creation date descending
        )
      );
    const sortedByCreationDate = ref(false);
    const showCompleted = ref(true);
    return { userData, completedStatuses, showCompleted, orders, sortedByCreationDate, statusTypesToMessage, statusTypesToColor };
  },
  components: {
    Orders,
  },
};
</script>

<template>
  <div id="top-controls">
    <button
      id="completed-visibility"
      v-on:click="showCompleted = !showCompleted"
    >
      {{ showCompleted ? "Hide" : "Show" }} completed
    </button>
    <button v-if="userData && (userData.isPI || userData.isIR)" v-on:click="viewAll()">View all orders</button>
    <button class="alt-button" id="new-order" v-on:click="createNewOrder()">
      New order
    </button>
  </div>
  <div id="orders-list">
    <Orders :orders="orders" :showCompleted="showCompleted" />
  </div>
</template>


<style>


.orderlist-table {
  grid-template-columns: minmax(8rem, 2fr) minmax(8rem, 2fr) minmax(8rem, 2fr) 12rem 12rem minmax(8rem, 1fr);
}

#top-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

#orders-list {
    overflow-x: auto;
}

#orders {
  width: 100%;
  /* border-spacing: 0; */
  border-collapse: collapse;
  /* background-color: var(--color-secondary); */
}

/* p, p {
  border: 1px solid var(--color-primary);
} */

</style>
