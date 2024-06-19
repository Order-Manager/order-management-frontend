<script>
    import Return from '../components/Return.vue'
    import {
        useCollection,
        useFirestore
    } from 'vuefire'
    import {
        collection,
        addDoc
    } from 'firebase/firestore'

    import {
        useCurrentUser
    } from "vuefire";

    export default {
        components: {
            Return
        },
        methods: {
            createOrder(email, uid) {
                const title = document.getElementById('title').value
                const supplierName = document.getElementById('supplier').value
                const db = useFirestore()

                addDoc(collection(db, 'orders'), {
                    creationDate: new Date(),
                    lastUpdate: new Date(),
                    requestedBy: email,
                    requestedById: uid,
                    status: 'pendingIR',
                    title: title,
                    supplier: supplierName,
                    items: items,
                    comments: comments,
                    updates: [],
                    reviewIR: false,
                    reviewPI: false,
                    requiresReviewPI: false
                })

                this.$router.push('/')
            }
        },
        setup() {
            const db = useFirestore()
            const suppliers = useCollection(collection(db, 'suppliers'))
            const user = useCurrentUser()

            return {
                suppliers, user
            }
        }
    }
</script>

<template>
    <Return />

    <div>
        <h2>Create a new order</h2>
        <div id="order-creation-form" >
            <div class="order-form-category">
                <label for="title">Title</label>
                <input type="text" id="title" name="title" required>
            </div>
            <div class="order-form-category">
                <label for="supplier">Supplier</label>
                <select id="supplier" name="supplier" required>
                    <option v-for="supplier in suppliers" :value="supplier.name" v-bind:key="supplier.name">
                        {{ supplier.name }}</option>
                </select>
            </div>
            <div class="order-form-category">
                <label for="items">Items</label>
                <ul id="items">
                    <li>
                        <label for="item-type">Type</label>
                        <label for="link">Link</label>
                        <label for="name">Name</label>
                        <label for="quantity">Quantity</label>
                    </li>
                    <li>
                        <select name="item-type">
                            <option value="item">Item</option>
                            <option value="cart">Cart</option>
                        </select>
                        <input type="url" name="link" required>
                        <!-- TODO: Input for name and quantity only if selected type is item -->
                        <input type="text" name="name" required>
                        <input type="number" name="quantity" required>

                    </li>
                </ul>
                <button class="alt-button" id="add-item">Add Item</button>
            </div>
            <button class="alt-button" v-on:click="createOrder(user.email, user.uid)">Create order</button>
        </div>
    </div>
</template>


<style>
    label {
        margin-right: 0.5rem;
    }

    .order-form-category {
        margin-bottom: 1rem;
    }

    #items > li {
        display: grid;
        grid-template-columns: 1fr 4fr 4fr 1fr;
        gap: 0.5rem;
    }

    #items > li > label {
        padding: 0.5rem;
        text-align: center;
    }

    #items > li > input {
        min-width: 4rem;
    }
</style>
