<script>
import { ref } from "vue";

import { useCollection, useFirestore, useCurrentUser } from "vuefire";
import { collection, where, query, orderBy } from "firebase/firestore";

export default {
  methods: {
    createNewOrder() {
      this.$router.push("/create");
    },
    goToOrder(id) {
      console.log(this.orders);
      this.$router.push(`/view/${id}`);
    },
    sortByCreationDate() {
      const db = useFirestore();
      const currentUser = useCurrentUser();

      if (this.sortedByCreationDate) return;
      this.orders = useCollection(
        query(
          // you can pass a query into useCollection
          collection(db, "orders"), // go to the sessions collection
          where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
          orderBy("creationDate", "desc") // order by creation date descending
        )
      );
      this.sortedByCreationDate = true;
    },
    sortByLastUpdate() {
      const db = useFirestore();
      const currentUser = useCurrentUser();

      if (!this.sortedByCreationDate) return;
      this.orders = useCollection(
        query(
          // you can pass a query into useCollection
          collection(db, "orders"), // go to the sessions collection
          where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
          orderBy("lastUpdate", "desc") // order by creation date descending
        )
      );
      this.sortedByCreationDate = false;
    },
  },
  setup() {
    const db = useFirestore();
    const currentUser = useCurrentUser();
    const statusTypesToMessage = {
        "pendingIR": "Pending Reasearch Engineer review",
        "pendingPI": "Pending Principal Investigator review",
        "refusedPI": "Refused by a Principal Investigator",
        "refusedIR": "Refused by a Reasearch Engineer",
        "ordered": "Ordered",
        "waiting": "Waiting for Pick Up",
        "completed": "Completed",
    };
    const updateTypesToMessage = {
        'order-creation': "Order Created",
        'order-cancellation': "Order Cancelled",
        'comment': "Comment",
        'waiting-for-reply': "Waiting for Reply",
        'review-ir-approved': "Approved by a Reasearch Engineer",
        'review-ir-refused': "Refused by a Reasearch Engineer",
        'review-pi-requested': "Review by a Principal Investigator requested",
        'review-pi-approved': "Approved by a Principal Investigator",
        'review-pi-refused': "Refused by a Principal Investigator",
        'order-delivered': "Order delivered, waiting for pick up",
        'order-completed': "Order completed"
    }
    // const orders = useCollection(collection(db, 'orders'))

    const orders = useCollection(
      query(
        // you can pass a query into useCollection
        collection(db, "orders"), // go to the sessions collection
        where("requestedBy", "==", currentUser.value.email), // only get the ones that belong to the user.
        orderBy("lastUpdate", "desc") // order by creation date descending
      )
    );
    const sortedByCreationDate = ref(false);
    const showCompleted = ref(false);
    return { showCompleted, orders, sortedByCreationDate, statusTypesToMessage };
  },
};
</script>

<template>
  <div>
    <div id="top-controls">
      <button
        id="completed-visibility"
        v-on:click="showCompleted = !showCompleted"
      >
        {{ showCompleted ? "Hide" : "Show" }} completed
      </button>
      <button class="alt-button" id="new-order" v-on:click="createNewOrder()">
        New order
      </button>
    </div>
    <div id="orders-list">
      <table id="orders">
        <tr>
          <th>Title</th>
          <th>Requested by</th>
          <th v-on:click="sortByCreationDate()">Creation Date</th>
          <th v-on:click="sortByLastUpdate()">Last Update</th>
          <th>Supplier</th>
          <th>Status</th>
        </tr>
        <tr
          v-on:click="goToOrder(order.id)"
          v-show="order.status != 'completed' || showCompleted"
          v-for="order in orders"
          :key="order.creationDate.toDate().toLocaleString('en-GB')"
        >
          <td>{{ order.title }}</td>
          <td>{{ order.requestedBy }}</td>
          <td>{{ order.creationDate.toDate().toLocaleString("en-GB") }}</td>
          <td>{{ order.lastUpdate.toDate().toLocaleString("en-GB") }}</td>
          <td>{{ order.supplier }}</td>
          <td>{{ statusTypesToMessage[order.status] ? statusTypesToMessage[order.status] : "Unknown Status" }}</td>
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

#orders-list {
    overflow-x: scroll;
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
  background-color: var(--color-secondary) !important;
}

#orders tr:hover td {
  color: var(--color-text-secondary) !important;
}
</style>
