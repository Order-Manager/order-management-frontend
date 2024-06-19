<script>
    import Return from '../components/Return.vue'
    import {
        ref
    } from 'vue'
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
                const comment = document.getElementById('comment').value
                const db = useFirestore()
                const items = []

                const itemsList = Array.from(document.getElementById('items-list').children).slice(1)

                for (let item of itemsList) {
                    // console.log(item);
                    const link = item.querySelector('input[name="link"]').value
                    if (link.length == 0) {
                        // TODO: Show error message
                        return
                    }
                    const type = item.querySelector('select[name="item-type"]').value
                    // .value
                    const name = item.querySelector('input[name="name"]').value
                    const quantity = item.querySelector('input[name="quantity"]').value

                    if (type === 'item' && (name.length == 0 || quantity.length == 0)) {
                        // TODO: Show error message
                        return
                    }

                    items.push({
                        type: type,
                        link: link,
                        name: name,
                        quantity: quantity
                    })
                }

                addDoc(collection(db, 'orders'), {
                    creationDate: new Date(),
                    lastUpdate: new Date(),
                    requestedBy: email,
                    requestedById: uid,
                    status: 'pendingIR',
                    title: title,
                    supplier: supplierName,
                    items: items,
                    comment: comment,
                    updates: [],
                    reviewIR: false,
                    reviewPI: false,
                    requiresReviewPI: false
                })

                this.$router.push('/')
            },
            addItem() {
                const itemsList = document.getElementById('items-list');

                const item = document.createElement('li')
                item.innerHTML = `
                    <select name="item-type">
                        <option value="item">Item</option>
                        <option value="cart">Cart</option>
                    </select>
                    <input type="url" name="link" required>
                    <input type="text" name="name" required>
                    <input type="number" name="quantity" required>
                `
                itemsList.appendChild(item)
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
                <label for="items-list">Items</label>
                <ul id="items-list">
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
                <button class="alt-button" id="add-item" v-on:click="addItem()">Add Item</button>
            </div>
            <div class="order-form-category">
                <label for="comment">Comment</label>
                <textarea id="comment" name="comment"></textarea>
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

    #items-list {
        margin: 0;
        padding: 0;
    }

    #items-list > li {
        display: grid;
        grid-template-columns: 1fr 4fr 4fr 1fr;
        gap: 0.5rem;
    }

    #items-list > li > label {
        padding: 0.5rem;
        text-align: center;
    }

    #items-list > li > input {
        min-width: 4rem;
    }
</style>
