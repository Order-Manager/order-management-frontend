<script>
import { ref } from "vue";

import { useDocument, useCollection, useFirestore, useCurrentUser } from "vuefire";
import { doc, collection, where, query, orderBy } from "firebase/firestore";

import Orders from "../components/Orders.vue";

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

    const completedStatuses = ["completed", "refusedPI", "refusedIR"];

    const statusTypesToMessage = {
        "pendingIR": "Pending Reasearch Engineer review",
        "pendingPI": "Pending Principal Investigator review",
        "refusedPI": "Refused by a Principal Investigator",
        "approvedPI": "Approved by a Principal Investigator",
        "refusedIR": "Refused by a Reasearch Engineer",
        "approvedIR": "Approved by a Reasearch Engineer",
        "processingOrder": "Processing Order",
        "ordered": "Ordered",
        "received": "Waiting for Pick Up",
        "completed": "Completed",
    };
    const statusTypesToColor = {
        "pendingIR": "orange",
        "pendingPI": "orange",
        "refusedPI": "red",
        "refusedIR": "red",
        "processingOrder": "blue",
        "ordered": "blue",
        "received": "blue",
        "completed": "green",
    };
    const updateTypesToMessage = {
        'order-creation': "Order Created",
        'order-cancelled': "Order Cancelled",
        'comment': "Comment",
        'waiting-for-reply': "Waiting for Reply",
        'review-ir-approved': "Approved by a Reasearch Engineer",
        'review-ir-refused': "Refused by a Reasearch Engineer",
        'review-pi-requested': "Review by a Principal Investigator requested",
        'review-pi-approved': "Approved by a Principal Investigator",
        'review-pi-refused': "Refused by a Principal Investigator",
        'order-processed': "Order Processed",
        'order-received': "Order delivered, waiting for pick up",
        'order-completed': "Order completed"
    }
    // const orders = useCollection(collection(db, 'orders'))

    const userData = useDocument(doc(db, 'admins', currentUser.value.uid))

      const orders = useCollection(
        query(
          // you can pass a query into useCollection
          collection(db, "orders"), // go to the sessions collection
          where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
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
    <button v-if="userData && (userData.isPI || userData.isRE)" v-on:click="viewAll()">View all orders</button>
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
  grid-template-columns: 2fr 2fr 2fr 1fr 1fr 1fr;
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
