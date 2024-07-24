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
    viewMyOrders() {
      this.$router.push("/");
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
          orderBy("lastUpdate", "desc") // order by creation date descending
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
    <button v-if="userData && (userData.isPI || userData.isIR)" v-on:click="viewMyOrders()">View my orders</button>
    <button class="alt-button" id="new-order" v-on:click="createNewOrder()">
      New order
    </button>
  </div>
  <div id="orders-list">
    <Orders :orders="orders" :showCompleted="showCompleted" />
  </div>
</template>


<style>
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
  border-collapse: collapse;
}

</style>
