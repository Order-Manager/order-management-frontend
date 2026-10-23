<script>
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
        where,
        orderBy
    } from 'firebase/firestore'

    import {
        useCurrentUser
    } from "vuefire";

    import { tagsTypes } from '../utils/definitions'

    import { useToast } from "vue-toastification";


    export default {
        components: {
            TagComponent
        },
        methods: {
            async createOrder(email, uid) {
                try {
                // 1. Form Data & Validation
                const title = this.title.trim();
                const comment = this.comment;
                const priority = this.priority;

                const items = [];

                if (title.length === 0) {
                    this.showError("Please provide a title for the order.");
                    return;
                }

                if (this.selectedTags.length === 0) {
                    this.showError("Please select at least one tag.");
                    return;
                }

                const supplierUrl = this.selectedSupplier.webpage.split("https://www.").slice(-1)[0].split("https://").slice(-1)[0];

                for (const { link, type, name, quantity, price } of this.items) {
                    if ((type === 'item' || type === 'cart') && link.length === 0) {
                        this.showError("Please provide a link for all items and carts.");
                        return;
                    }

                    const croppedLink = link.split("https://www.").slice(-1)[0].split("https://").slice(-1)[0];

                    if ((type === 'item' || type === 'cart') && !croppedLink.startsWith(supplierUrl)) {
                        this.showError("The link of the item must start with the supplier's webpage.");
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

                    items.push({ type, link, name, quantity: String(quantity), price: String(price) });
                }

                const status = this.isDraft ? 'draft' : 'pendingIR';

                // 2. Firestore Interaction
                const db = useFirestore();
                await addDoc(collection(db, 'orders'), {
                    creationDate: new Date(),
                    lastUpdate: new Date(),
                    requestedBy: email,
                    requestedById: uid,
                    status: status,
                    title,
                    supplier: this.selectedSupplier.name,
                    items,
                    comment,
                    updates: [],
                    tags: this.selectedTags.map(tag => tag.id),
                    priority
                });

                // 3. Success Handling and Redirect
                // Optionally show a success message
                this.showSuccess("Order created successfully!");

                this.$router.push('/');

                } catch (error) {
                    // 4. Error Handling
                    console.error("Error creating order:", error);
                    // Show an error message to the user
                    this.showError("An error occurred while creating the order.");
                }
            },
            async saveAsDraft(email, uid) {
                this.isDraft = true;
                await this.createOrder(email, uid);
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
            async pasteItemFromClipboard() {
                try {
                    const text = await navigator.clipboard.readText();
                    const item = JSON.parse(text);
                    // Basic validation
                    if (item && item.name && item.link && item.quantity && item.price !== undefined) {
                        if (!item.type) {
                            item.type = 'item'; // Default type
                        }
                        this.items.push(item);
                        this.showSuccess("Item pasted!");
                    } else {
                        this.showError("Clipboard does not contain a valid item.");
                    }
                } catch (e) {
                    this.showError("Failed to paste item.");
                }
            }
        },
        data() {
            return {
                items: [{
                    type: 'item',
                    link: '',
                    name: '',
                    quantity: 1,
                    price: 0.00
                }],
                selectedSupplier: {
                    name: '',
                    webpage: ''
                },
                isDraft: false,
                title: '',
                comment: '',
                priority: 'low'
            }
        },
        setup() {
            const db = useFirestore()
            const suppliers = useCollection(
                query(
                    collection(db, 'suppliers'),
                    where('hidden', '!=', true),
                    orderBy('name')
                )
            );
            const user = useCurrentUser()

            const tags = useCollection(collection(db, 'tags'));
            const selectedTags = ref([]);

            const toast = useToast();

            return {
                suppliers, user, tags, tagsTypes, selectedTags, toast
            }
        },
        watch: {
            suppliers: {
                immediate: true,
                handler() {
                    this.selectedSupplier = this.suppliers[0];
                }
            }
        }
    }
</script>

<template>
    <div>
        <div class="center-column">
            <h1 class="page-title">New order</h1>
        </div>
        <form id="order-creation-form" novalidate @submit.prevent="createOrder(user.email, user.uid)">
            <section id="order-guidelines" aria-labelledby="guidelines-title">
                <h2 id="guidelines-title">If you want your order to be accepted</h2>
                <ul>
                    <li>Give a clear title to your order</li>
                    <li>Give a clear name to each item including the options you want e.g. “Acrylic sheet 3x200x300mm”</li>
                    <li>Delivery options - price and date - should be reasonable</li>
                    <li>If you need to order several items, try to find them on the same supplier before placing several orders</li>
                </ul>
            </section>
            <div class="order-form-category">
                <label class="category-label" for="title">Title</label>
                <input type="text" id="title" name="title" v-model="title" required>
            </div>
            <div class="order-form-category">
                <label class="category-label" for="supplier">Supplier</label>
                <div class="flex center-row" style="gap: 1rem;">
                    <select id="supplier" name="supplier" v-model="selectedSupplier" required aria-describedby="supplier-hint">
                        <option v-for="supplier in suppliers" :value="supplier" v-bind:key="supplier.id">{{ supplier.name }}</option>
                    </select>
                    <p id="supplier-hint" class="blue" style="margin: 0">The links of the items must start with <a :href="selectedSupplier ? selectedSupplier.webpage : ''">{{ selectedSupplier ? selectedSupplier.webpage : '' }}</a>. If your supplier is not in the list, please contact <a href="mailto:dvic@devinci.fr">dvic@devinci.fr</a>.</p>
                </div>
            </div>
            <fieldset class="order-form-category">
                <legend class="category-label">Tags</legend>
                <div class="full-width">
                    <p id="selected-tags" aria-live="polite">
                        <span class="visually-hidden">Selected tags: </span>
                        <span v-if="selectedTags.length === 0">None selected</span>
                        <span v-else>{{ selectedTags.map(tag => tag.name).join(", ") }}</span>
                    </p>
                    <TagComponent :selectedTags="selectedTags" />
                </div>
            </fieldset>
            <fieldset class="order-form-category">
                <legend class="category-label">Priority</legend>
                <div id="priority-div">
                    <div>
                        <input type="radio" id="low" name="priority" value="low" v-model="priority">
                        <label for="low">Low</label>
                    </div>
                    <div>
                        <input type="radio" id="medium" name="priority" value="medium" v-model="priority">
                        <label for="medium">Medium</label>
                    </div>
                    <div>
                        <input type="radio" id="high" name="priority" value="high" v-model="priority">
                        <label for="high">High</label>
                    </div>
                </div>
            </fieldset>
            <fieldset class="order-form-category full-width">
                <legend class="category-label">Items</legend>

                <div class="full-width">
                    <div id="items-list" class="table-scroll">
                        <table class="data-table items-table">
                            <caption class="visually-hidden">Items to order</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Type</th>
                                    <th scope="col">Name</th>
                                    <th scope="col">Link</th>
                                    <th scope="col">Quantity</th>
                                    <th scope="col">Unit price (€)</th>
                                    <th scope="col"><span class="visually-hidden">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(item, index) in items" :key="index">
                                    <td class="col-type" data-label="Type">
                                        <select name="item-type" v-model="item.type" :aria-label="`Item ${index + 1} type`">
                                            <option value="item">Item</option>
                                            <option value="cart">Cart</option>
                                            <option value="stock">Stock</option>
                                        </select>
                                    </td>
                                    <td data-label="Name"><input type="text" name="name" v-model="item.name" required :aria-label="`Item ${index + 1} name`"></td>
                                    <td data-label="Link"><input type="url" name="link" v-model="item.link" required :aria-label="`Item ${index + 1} link`"></td>
                                    <td data-label="Quantity"><input type="number" inputmode="numeric" name="quantity" v-model="item.quantity" min="1" required :aria-label="`Item ${index + 1} quantity`"></td>
                                    <td data-label="Unit price (€)"><input type="number" inputmode="decimal" name="price" min="0.000" max="10000.00" step="0.001" v-model="item.price" required :aria-label="`Item ${index + 1} unit price in euros`"/></td>
                                    <td class="col-actions">
                                        <button type="button" class="icon-button red" @click="removeItem(index)" :aria-label="`Remove item ${index + 1}`" title="Remove item">
                                            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="full-width center-both">
                        <button type="button" class="icon-button add-item" v-on:click="addItem()" aria-label="Add item" title="Add item">
                            <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
                        </button>
                        <button type="button" class="icon-button add-item" v-on:click="pasteItemFromClipboard()" aria-label="Paste item" title="Paste item">
                            <span class="material-symbols-outlined" aria-hidden="true">content_paste</span>
                        </button>
                    </div>
                </div>
            </fieldset>
            <div class="order-form-category">
                <label class="category-label" for="comment">Comment</label>
                <textarea id="comment" name="comment" v-model="comment" rows="3"></textarea>
            </div>
            <div class="center-row medium-gap form-actions">
                <button type="submit" class="alt-button" @click="isDraft = false">Create order</button>
                <button type="button" v-on:click="saveAsDraft(user.email, user.uid)">Save as draft</button>
            </div>
        </form>
    </div>
</template>


<style>

    .page-title {
        margin-top: 0;
    }

    .order-form-category {
        margin: 0 0 2rem 0;
        display: flex;
    }

    fieldset.order-form-category {
        border: none;
        padding: 0;
        min-width: 0;
    }

    /* Legends don't take part in flex layout, so float them into the label column */
    fieldset.order-form-category > legend {
        float: left;
        padding: 0;
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

        #title, #selected-tags, #comment {
            width: 100%;
            box-sizing: border-box;
        }

        #supplier {
            width: 100%;
        }

        .order-form-category .flex.center-row {
            flex-direction: column;
            align-items: stretch;
        }

        .form-actions {
            flex-direction: column;
            align-items: stretch;
        }

        #priority-div {
            flex-wrap: wrap;
        }
    }

    #order-guidelines {
        background-color: var(--color-primary);
        border: 1px solid var(--red);
        border-radius: 1rem;
        margin: 1rem auto;
        padding: 1rem;
        color: var(--red);
    }

    #order-guidelines h2 {
        margin: 0;
        font-size: 1rem;
        text-transform: uppercase;
    }

    #title {
        width: calc(100% - 2rem);
    }

    #selected-tags {
        display: flex;
        align-items: center;
        margin: 0;
        background-color: var(--color-primary);
        width: calc(100% - 2rem);
        min-height: 2rem;
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
    }


    #priority-div {
        display: flex;
        flex-direction: row;
        gap: 1rem;
    }

    #priority-div > div {
        display: flex;
        align-items: center;
        min-height: 2.75rem;
    }

    #priority-div > div > label {
        padding-left: 0.5rem;
        cursor: pointer;
    }

    .items-table select {
        min-width: 6.5rem;
    }

    .add-item {
        font-size: 2rem;
        margin: 0.5rem;
    }

    /* Phones and tablets: each item becomes a card with its labels above the fields */
    @media (max-width: 59.99rem) {
        .items-table thead {
            display: block;
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
        }

        .items-table, .items-table tbody, .items-table tr, .items-table td {
            display: block;
        }

        .items-table tbody tr {
            padding: 0.75rem 1rem;
        }

        .items-table td {
            padding: 0.25rem 0;
            text-align: left;
        }

        .items-table td[data-label]::before {
            display: block;
            content: attr(data-label);
            color: var(--text-muted);
            font-weight: 400;
            margin-bottom: 0.15rem;
        }

        .items-table .col-actions {
            display: flex;
            justify-content: flex-end;
        }
    }

</style>
