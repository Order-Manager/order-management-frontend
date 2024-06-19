<script>
import Return from '../components/Return.vue'
import { useDocument, useFirestore } from 'vuefire'
import { collection, doc } from 'firebase/firestore'

import { useRoute } from 'vue-router'

const types = {
    'order-creation': "",
    'order-cancellation': "",
    'comment': "",
    'review-pi': "",
    'review-ir': "",
    'order-ready': "",
    'order-completed': "",
}

export default {
    components: {
        Return
    },
    methods: {
        goToOrder(date) {
            this.$router.push(`/view/${date}`)
        }
    },
    props: {
        order_id: String,
    },
    setup() {
        const db = useFirestore()
        const route = useRoute()
        const order_id = route.params.id
        const order = useDocument(doc(db, 'orders', order_id))

        return {
            order
        }
    }
}
</script>

<template>
    <Return />

    <div v-if="order">
        <h2>{{ order.title }}</h2>
        <p>Requested by: {{ order.requestedBy }}</p>
        <p>Creation date: {{ order.creationDate.toDate() }}</p>
        <p>Last update: {{ order.lastUpdate.toDate() }}</p>
        <p>Status: {{ order.status }}</p>
    </div>
</template>


<style>

</style>
