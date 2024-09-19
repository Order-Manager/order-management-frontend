<script>
    import Return from '../components/Return.vue'
    import TagComponent from '../components/Tags.vue'
    import {
        ref
    } from 'vue'
    import {
        useCollection,
        useFirestore
    } from 'vuefire'
    import {
        collection,
        addDoc,
        query,
        where
    } from 'firebase/firestore'

    import {
        useCurrentUser
    } from "vuefire";

    import { tagsTypes } from '../utils/definitions'

    import { useToast } from "vue-toastification";



    export default {
        components: {
            Return, TagComponent
        },
        methods: {
            async createOrder(email, uid) {
                try {
                // 1. Form Data & Validation
                const title = document.getElementById('title').value;
                const supplierName = document.getElementById('supplier').value;
                const comment = document.getElementById('comment').value;
                const priority = document.querySelector('input[name="priority"]:checked').value;

                const items = [];
                const itemsList = Array.from(document.getElementById('items-list').children)
                                        .slice(1)
                                        .filter(item => item.classList.contains('table-row'));

                if (title.length === 0) {
                    this.showError("Please provide a title for the order.");
                    return;
                }

                if (this.selectedTags.length === 0) {
                    this.showError("Please select at least one tag.");
                    return;
                }

                for (const item of itemsList) {
                    const link = item.querySelector('input[name="link"]').value;
                    const type = item.querySelector('select[name="item-type"]').value;
                    const name = item.querySelector('input[name="name"]').value;
                    const quantity = item.querySelector('input[name="quantity"]').value;
                    const price = item.querySelector('input[name="price"]').value;

                    if ((type === 'item' || type === 'cart') && link.length === 0) {
                        this.showError("Please provide a link for all items and carts.");
                        return;
                    }

                    if (name.length === 0) {
                        this.showError("Please provide a name for all items.");
                        return;
                    }

                    if (quantity <= 0) {
                        this.showError("Quantity must be greater than 0.");
                        return;
                    }

                    items.push({ type, link, name, quantity, price });
                }

                // 2. Firestore Interaction
                const db = useFirestore();
                await addDoc(collection(db, 'orders'), {
                    creationDate: new Date(),
                    lastUpdate: new Date(),
                    requestedBy: email,
                    requestedById: uid,
                    status: 'pendingIR',
                    title,
                    supplier: supplierName,
                    items,
                    comment,
                    updates: [],
                    tags: this.selectedTags.map(tag => tag.id),
                    priority
                });

                // 3. Success Handling and Redirect
                // Optionally show a success message
                this.showSuccess("Order created successfully!");

                // Clear the form (consider using a form reset if available)
                document.getElementById('title').value = '';
                document.getElementById('supplier').value = '';
                document.getElementById('comment').value = '';

                this.$router.push('/');

                } catch (error) {
                // 4. Error Handling
                console.error("Error creating order:", error);
                // Show an error message to the user
                this.showError("An error occurred while creating the order.");
                }
            },
            showError(message) {
                this.toast.error(message);
            },
            showSuccess(message) {
                this.toast.success(message);
            },
            showWarning(message) {
                this.toast.warning(message);
            },
            showInfo(message) {
                this.toast.info(message);
            },
            addItem() {
                this.items.push({
                type: 'item', // Default type
                link: '',
                name: '',
                quantity: 1,
                price: 0.00
                });
            },
            removeItem(index) {
                this.items.splice(index, 1);
                this.showInfo("Item removed.");
            },
            openTab(type) {
                const tabs = document.getElementsByClassName('tag-tab')
                for (let tab of tabs) {
                    tab.style.display = 'none'
                }
                document.getElementById(type).style.display = 'flex'

                const buttons = document.getElementsByClassName('tag-type-button')
                for (let button of buttons) {
                    button.classList.remove('alt-button')
                }
                document.getElementById(type + '-type-button').classList.add('alt-button')
            },
            toggleTag(tag, type) {
                const index = this.selectedTags.indexOf(tag)
                const button = document.getElementById(type + '-' + tag.id + '-name-button')
                if (index === -1) {
                    this.selectedTags.push(tag)
                    button.classList.add('alt-button')
                } else {
                    this.selectedTags.splice(index, 1)
                    button.classList.remove('alt-button')
                }
            },
            isStock(idx) {
                console.log(idx)
            }
        },
        data() {
            return { items: [{
                type: 'item',
                link: '',
                name: '',
                quantity: 1,
                price: 0.00
            }] }
        },
        setup() {
            const db = useFirestore()
            const suppliers = useCollection(
                query(
                    collection(db, 'suppliers'),
                    where('hidden', '!=', true)
                ))
            const user = useCurrentUser()

            const tags = useCollection(collection(db, 'tags'));
            const selectedTags = ref([]);

            const toast = useToast();

            return {
                suppliers, user, tags, tagsTypes, selectedTags, toast
            }
        },
        mounted() {
            this.openTab('project');
            // console.log(this.tagsTypes)
        }
    }
</script>

<template>
    <Return />

    <div>
        <div class="center-column">
            <h2 class="page-title">Create a new order</h2>
        </div>
        <div id="order-creation-form" >
            <div class="order-form-category">
                <label class="category-label" for="title">Title</label>
                <input type="text" id="title" name="title" required>
            </div>
            <div class="order-form-category">
                <label class="category-label" for="supplier">Supplier</label>
                <select id="supplier" name="supplier" required>
                    <option v-for="supplier in suppliers" :value="supplier.name" v-bind:key="supplier.name">
                        {{ supplier.name }}</option>
                </select>
            </div>
            <div class="order-form-category">
                <label class="category-label">Tags</label>
                <div class="full-width">
                    <div id="selected-tags">
                        <span v-for="(tag, index) in selectedTags" :key="tag" class="tag">{{ tag.name }}  <span v-if="index != selectedTags.length - 1">, </span></span>
                    </div>
                    <TagComponent :selectedTags="selectedTags" />
                </div>
            </div>
            <div class="order-form-category">
                <label class="category-label">Priority level</label>
                <div id="priority-div">
                    <div>
                        <input type="radio" id="low" name="priority" value="low" checked>
                        <label for="low">Low</label>
                    </div>
                    <div>
                        <input type="radio" id="medium" name="priority" value="medium">
                        <label for="medium">Medium</label>
                    </div>
                    <div>
                        <input type="radio" id="high" name="priority" value="high">
                        <label for="high">High</label>
                    </div>
                </div>
            </div>
            <div class="order-form-category full-width">
                <label class="category-label" for="items-list">Items</label>

                <div class="full-width">
                    <div id="items-list" class="table full-width">
                        <div class="table-header items-table">
                            <p>Type</p>
                            <p>Link</p>
                            <p>Name</p>
                            <p>Quantity</p>
                            <p>Unit Price (€)</p>
                        </div>

                        <div v-for="(item, index) in items" :key="index" class="table-row items-table">
                            <select name="item-type" v-model="item.type">
                            <option value="item">Item</option>
                            <option value="cart">Cart</option>
                            <option value="stock">Stock</option>
                            </select>
                            <input type="url" name="link" v-model="item.link" required>
                            <input type="text" name="name" v-model="item.name" required>
                            <input type="number" name="quantity" v-model="item.quantity" required>
                            <input type="number" name="price" min="0.00" max="10000.00" step="0.01" v-model="item.price" required/>
                            <span class="material-symbols-outlined red remove-item" @click="removeItem(index)">
                            cancel
                            </span>
                        </div>
                    </div>

                    <div class="full-width center-column">
                        <span class="material-symbols-outlined" id="add-item" v-on:click="addItem()">
                            add_circle
                        </span>
                    </div>
                </div>
            </div>
            <div class="order-form-category">
                <label class="category-label" for="comment">Comment</label>
                <textarea id="comment" name="comment"></textarea>
            </div>
            <button class="alt-button" v-on:click="createOrder(user.email, user.uid)">Create order</button>
        </div>
    </div>
</template>


<style>

    .page-title {
        margin-top: 0;
    }

    .order-form-category {
        margin-bottom: 2rem;
        display: flex;
    }

    @media (max-width: 768px) {
        .order-form-category {
            flex-direction: column;
        }
    }

    .category-label {
        margin-right: 0.5rem;
        min-width: 8rem;
    }

    @media (max-width: 768px) {
        .category-label {
            min-width: 0;
        }

        .items-table {
            width: 768px;
        }
    }

    #title {
        width: calc(100% - 2rem);
    }

    #selected-tags {
        display: flex;
        flex-direction: row;

        align-items: center;

        background-color: var(--color-primary);
        width: calc(100% - 2rem);
        height: 2rem;
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
    }

    #selected-tags > span {
        margin-right: 0.5rem;
    }


    .tag-tab {
        display: none;
        padding: 0.5rem 0;
        gap: 0.5rem;
    }

    #tags-types-div {
        display: flex;
        flex-direction: row;
        margin-top: 0.5rem;
        width: 100%;
        border-radius: 0.5rem;
        overflow: hidden;
    }

    #tags-types-div > button {
        border-radius: 0;
        width: 100%;
    }

    #tags-types-div > button:first-child {
        border-top-left-radius: 0.5rem;
        border-bottom-left-radius: 0.5rem;
    }

    #tags-types-div > button:last-child {
        border-top-right-radius: 0.5rem;
        border-bottom-right-radius: 0.5rem;
    }

    #priority-div {
        display: flex;
        flex-direction: row;
        gap: 1rem;
    }

    #priority-div > div > label {
        padding-left: 0.5rem;
    }

    .table {
        width: 100%;
    }

    .items-table {
        border: 3px solid transparent !important;
        grid-template-columns: 7rem 3fr 3fr 6rem 8rem 4rem;
        cursor: initial !important;
    }


    .remove-item {
        cursor: pointer;
    }

    #add-item {
        cursor: pointer;
        font-size: 2rem;
        margin-top: 1rem;
    }

    #add-item span {
        font-size: 2rem;
    }

    #add-item {
        width: 3rem;
        height: 3rem;
    }


</style>
