<script setup>
// Parts the lab usually buys. Students add them to a cart and turn each supplier's share into an order;
// referents keep the list up to date.
import { computed, nextTick, ref } from 'vue'
import { useCollection, useCurrentUser, useDocument, useFirestore } from 'vuefire'
import { addDoc, collection, deleteDoc, doc, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { useToast } from 'vue-toastification'
import StockBadge from '../components/StockBadge.vue'
import {
    CATALOG_CATEGORIES, STOCK_LEVELS, addToCart, cart, cartBySupplier, cartCount, cartLine, groupByCategory,
    linkMatchesSupplier, matchesSearch, partLabel, setCartQuantity,
} from '../utils/catalog.js'
import { formatEuros } from '../utils/dates.js'

const db = useFirestore()
const user = useCurrentUser()
const toast = useToast()

const userData = useDocument(computed(() => user.value && doc(db, 'admins', user.value.uid)))
const isStaff = computed(() => !!(userData.value && userData.value.isIR))

const allParts = useCollection(collection(db, 'catalog'))
const suppliers = useCollection(query(collection(db, 'suppliers'), where('hidden', '!=', true), orderBy('name')))

const search = ref('')
const category = ref('all')

// Hidden parts stay in the list for referents, so they can bring them back
const visibleParts = computed(() => allParts.value.filter(part => isStaff.value || !part.hidden))
const categories = computed(() => {
    const used = new Set(visibleParts.value.map(part => part.category || 'Other'))
    return [...CATALOG_CATEGORIES.filter(c => used.has(c)), ...[...used].filter(c => !CATALOG_CATEGORIES.includes(c)).sort()]
})
const groups = computed(() => groupByCategory(visibleParts.value.filter(part =>
    (category.value === 'all' || (part.category || 'Other') === category.value) && matchesSearch(part, search.value))))
const shownCount = computed(() => groups.value.reduce((sum, group) => sum + group.parts.length, 0))

function add(part) {
    addToCart(part)
    toast.success(`${partLabel(part)} added to your cart.`, { timeout: 2500 })
}

function cartTotal(lines) {
    return lines.reduce((sum, line) => sum + Number(line.price) * Number(line.quantity), 0)
}

// --- Editing, for referents ---

const editDialog = ref(null)
const editing = ref(null) // the part being edited, or null for a new one
const form = ref({})
const formErrors = ref({})
const saving = ref(false)
const confirmingDelete = ref(false)

function openEditor(part) {
    editing.value = part || null
    form.value = part
        ? { name: part.name, note: part.note || '', category: part.category || '', supplier: part.supplier, link: part.link, price: part.price, stock: part.stock || '', hidden: !!part.hidden }
        : { name: '', note: '', category: category.value === 'all' ? '' : category.value, supplier: suppliers.value[0]?.name || '', link: '', price: 0, stock: '', hidden: false }
    formErrors.value = {}
    confirmingDelete.value = false
    editDialog.value.showModal()
}

function validate() {
    const errors = {}
    const f = form.value
    if (!f.name.trim()) errors.name = 'Name this part.'
    if (!f.category.trim()) errors.category = 'Choose or type a category.'
    const supplier = suppliers.value.find(s => s.name === f.supplier)
    if (!supplier) errors.supplier = 'Choose a supplier.'
    if (!f.link.trim()) errors.link = 'Paste the link to the part.'
    else if (supplier && !linkMatchesSupplier(f.link, supplier.webpage)) errors.link = `The link must start with ${supplier.webpage}.`
    if (!(Number(f.price) >= 0)) errors.price = 'Enter a price, or 0 if unknown.'
    return errors
}

async function save() {
    formErrors.value = validate()
    if (Object.keys(formErrors.value).length) {
        nextTick(() => editDialog.value.querySelector('[aria-invalid="true"]')?.focus())
        return
    }
    const f = form.value
    const data = {
        name: f.name.trim(), note: f.note.trim(), category: f.category.trim(), supplier: f.supplier,
        link: f.link.trim(), price: Number(f.price), stock: f.stock, hidden: f.hidden,
        updatedAt: serverTimestamp(), updatedBy: user.value.email,
    }
    saving.value = true
    try {
        if (editing.value) await updateDoc(doc(db, 'catalog', editing.value.id), data)
        else await addDoc(collection(db, 'catalog'), data)
        toast.success(editing.value ? 'Part updated.' : 'Part added to the catalogue.')
        editDialog.value.close()
    } catch (e) {
        toast.error('Could not save the part: ' + e.message)
    } finally {
        saving.value = false
    }
}

// Quick update from the list, without opening the editor
async function setStock(part, stock) {
    try {
        await updateDoc(doc(db, 'catalog', part.id), { stock, updatedAt: serverTimestamp(), updatedBy: user.value.email })
    } catch (e) {
        toast.error('Could not update the stock: ' + e.message)
    }
}

async function remove() {
    saving.value = true
    try {
        await deleteDoc(doc(db, 'catalog', editing.value.id))
        toast.success('Part deleted.')
        editDialog.value.close()
    } catch (e) {
        toast.error('Could not delete the part: ' + e.message)
    } finally {
        saving.value = false
    }
}
</script>

<template>
    <h1 class="page-title">Parts</h1>
    <p class="parts-intro">
        Parts the lab often buys, with the supplier and the price from the last order.
        Add what you need to your cart, then create one order per supplier.
    </p>

    <div class="parts-layout">
        <div class="parts-main">
            <div class="parts-controls">
                <label for="parts-search" class="visually-hidden">Search parts</label>
                <input id="parts-search" type="search" enterkeyhint="search" v-model="search" placeholder="Search parts..." />
                <button v-if="isStaff" type="button" class="primary" @click="openEditor()">New part</button>
            </div>

            <fieldset class="parts-chips">
                <legend class="visually-hidden">Category</legend>
                <label v-for="option in ['all', ...categories]" :key="option" class="chip">
                    <input type="radio" name="parts-category" class="visually-hidden" :value="option" v-model="category" />
                    <span class="material-symbols-outlined" aria-hidden="true" v-if="category === option">check</span>
                    {{ option === 'all' ? 'All' : option }}
                </label>
            </fieldset>

            <p class="visually-hidden" role="status">{{ shownCount }} part{{ shownCount === 1 ? '' : 's' }} shown</p>

            <section v-for="group in groups" :key="group.category" class="parts-group" :aria-labelledby="`parts-${group.category}`">
                <h2 :id="`parts-${group.category}`" class="group-title">
                    {{ group.category }} <span class="group-count">{{ group.parts.length }}</span>
                </h2>
                <ul class="parts-list">
                    <li v-for="part in group.parts" :key="part.id" :class="{ hidden: part.hidden }">
                        <div class="part-text">
                            <span class="part-name">
                                {{ part.name }}
                                <StockBadge v-if="!isStaff" :stock="part.stock" />
                                <span v-if="part.hidden" class="status-badge grey">Hidden</span>
                            </span>
                            <span class="part-meta">
                                <span v-if="part.note">{{ part.note }} · </span>{{ part.supplier }} · {{ formatEuros(part.price) }}
                            </span>
                        </div>
                        <div class="part-actions">
                            <template v-if="isStaff">
                                <label :for="`stock-${part.id}`" class="visually-hidden">Stock of {{ partLabel(part) }}</label>
                                <select :id="`stock-${part.id}`" class="stock-select" :class="STOCK_LEVELS[part.stock]?.color" :value="part.stock || ''" @change="setStock(part, $event.target.value)">
                                    <option value="">Stock unknown</option>
                                    <option v-for="(level, key) in STOCK_LEVELS" :key="key" :value="key">{{ level.label }}</option>
                                </select>
                            </template>
                            <a :href="part.link" target="_blank" rel="noopener noreferrer" class="icon-button" :aria-label="`${part.name} on ${part.supplier} (opens in a new tab)`" title="View on the supplier's website">
                                <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                            </a>
                            <button v-if="isStaff" type="button" class="icon-button" :aria-label="`Edit ${part.name}`" title="Edit" @click="openEditor(part)">
                                <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                            </button>
                            <button type="button" class="add-part" @click="add(part)">
                                <span class="material-symbols-outlined" aria-hidden="true">add_shopping_cart</span>
                                <span class="add-label" aria-hidden="true">Add</span>
                                <span class="visually-hidden">Add {{ partLabel(part) }} to cart{{ cartLine(part.id) ? ` (${cartLine(part.id).quantity} in cart)` : '' }}</span>
                                <span v-if="cartLine(part.id)" class="group-count" aria-hidden="true">{{ cartLine(part.id).quantity }}</span>
                            </button>
                        </div>
                    </li>
                </ul>
            </section>

            <div v-if="!shownCount" class="empty-state" role="status">
                <p v-if="!allParts.length">The catalogue is empty for now.</p>
                <p v-else>No parts match “{{ search.trim() }}”.</p>
            </div>
        </div>

        <aside class="parts-cart" :class="{ empty: !cart.length }" aria-labelledby="cart-title">
            <h2 id="cart-title" class="group-title">
                <span class="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
                Cart <span class="group-count">{{ cartCount }}</span>
            </h2>
            <p v-if="!cart.length" class="cart-empty">Your cart is empty. Add parts from the list.</p>
            <section v-for="group in cartBySupplier" :key="group.supplier" class="cart-group" :aria-label="`${group.supplier} parts`">
                <h3>{{ group.supplier }}</h3>
                <ul>
                    <li v-for="line in group.lines" :key="line.partId">
                        <span class="cart-name">{{ partLabel(line) }}</span>
                        <span class="cart-quantity">
                            <label :for="`cart-${line.partId}`" class="visually-hidden">Quantity of {{ partLabel(line) }}</label>
                            <input :id="`cart-${line.partId}`" type="number" inputmode="numeric" min="0" :value="line.quantity"
                                @change="setCartQuantity(line.partId, Math.floor(Number($event.target.value)))" />
                            <button type="button" class="icon-button red" :aria-label="`Remove ${partLabel(line)} from cart`" title="Remove" @click="setCartQuantity(line.partId, 0)">
                                <span class="material-symbols-outlined" aria-hidden="true">close</span>
                            </button>
                        </span>
                    </li>
                </ul>
                <router-link class="button-link primary" :to="{ path: '/create', query: { cart: group.supplier } }">
                    Order from {{ group.supplier }} · {{ formatEuros(cartTotal(group.lines)) }}
                </router-link>
            </section>
        </aside>
    </div>

    <dialog ref="editDialog" class="dialog part-dialog" aria-labelledby="part-dialog-title">
        <form novalidate @submit.prevent="save()">
            <h2 id="part-dialog-title">{{ editing ? 'Edit part' : 'New part' }}</h2>

            <label for="part-name">Name</label>
            <input id="part-name" v-model="form.name" :aria-invalid="!!formErrors.name" aria-describedby="part-name-error" />
            <p id="part-name-error" class="field-error">{{ formErrors.name }}</p>

            <label for="part-note">Pack or variant <span class="optional">(optional)</span></label>
            <input id="part-note" v-model="form.note" placeholder="Pack of 10" />

            <label for="part-category">Category</label>
            <input id="part-category" v-model="form.category" list="part-categories" :aria-invalid="!!formErrors.category" aria-describedby="part-category-error" />
            <datalist id="part-categories">
                <option v-for="c in categories" :key="c" :value="c" />
            </datalist>
            <p id="part-category-error" class="field-error">{{ formErrors.category }}</p>

            <label for="part-supplier">Supplier</label>
            <select id="part-supplier" v-model="form.supplier" :aria-invalid="!!formErrors.supplier" aria-describedby="part-supplier-error">
                <option v-for="s in suppliers" :key="s.id" :value="s.name">{{ s.name }}</option>
            </select>
            <p id="part-supplier-error" class="field-error">{{ formErrors.supplier }}</p>

            <label for="part-link">Link</label>
            <input id="part-link" type="url" v-model="form.link" :aria-invalid="!!formErrors.link" aria-describedby="part-link-error" />
            <p id="part-link-error" class="field-error">{{ formErrors.link }}</p>

            <label for="part-price">Price (€)</label>
            <input id="part-price" type="number" inputmode="decimal" min="0" step="0.01" v-model="form.price" :aria-invalid="!!formErrors.price" aria-describedby="part-price-error" />
            <p id="part-price-error" class="field-error">{{ formErrors.price }}</p>

            <label for="part-stock">Stock at the lab</label>
            <select id="part-stock" v-model="form.stock" aria-describedby="part-stock-hint">
                <option value="">Unknown</option>
                <option v-for="(level, key) in STOCK_LEVELS" :key="key" :value="key">{{ level.label }}</option>
            </select>
            <p id="part-stock-hint" class="field-hint">A rough idea, no counts. Students see it here and next to matching items in their orders.</p>

            <label class="part-hidden-toggle">
                <input type="checkbox" v-model="form.hidden" />
                Hide from students
            </label>

            <div v-if="confirmingDelete" class="part-delete-confirm" role="alert">
                <p>Delete {{ editing.name }} for good? Hiding it keeps it for later.</p>
                <div class="dialog-actions">
                    <button type="button" @click="confirmingDelete = false">Keep it</button>
                    <button type="button" class="danger" :disabled="saving" @click="remove()">Delete part</button>
                </div>
            </div>
            <div v-else class="dialog-actions">
                <button v-if="editing" type="button" class="danger part-delete" @click="confirmingDelete = true">Delete</button>
                <button type="button" @click="editDialog.close()">Cancel</button>
                <button type="submit" class="primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            </div>
        </form>
    </dialog>
</template>

<style>
.parts-intro {
    margin: 0 0 var(--space-5) 0;
    max-width: 48rem;
}

.parts-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 20rem;
    gap: var(--space-6);
    align-items: start;
}

.parts-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
}

#parts-search {
    flex: 1 1 12rem;
    min-width: 0;
}

.parts-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0 0 var(--space-5) 0;
    padding: 0;
    border: none;
}

.parts-chips .chip {
    cursor: pointer;
}

.parts-chips .chip:has(input:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
}

.parts-chips .chip .material-symbols-outlined {
    font-size: 1.1rem;
}

.parts-group {
    margin-bottom: var(--space-5);
}

.parts-list {
    margin: 0;
    padding: 0;
    list-style: none;
    border-radius: var(--radius);
    border: 1px solid var(--border-muted);
    background-color: var(--bg);
}

.parts-list li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
}

.parts-list li + li {
    border-top: 1px solid var(--border-muted);
}

.parts-list li.hidden .part-name {
    color: var(--text-muted);
}

.part-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.part-name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--text);
}

.part-meta {
    font-size: var(--font-sm);
    color: var(--text-muted);
}

.part-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
}

/* Same width with or without the count, so the rows stay aligned */
.add-part {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-width: 7rem;
}

.stock-select {
    width: 9.5rem;
    font-size: var(--font-sm);
}

.add-part .group-count {
    background-color: var(--accent);
    color: var(--on-accent);
}

.parts-cart {
    position: sticky;
    top: calc(env(safe-area-inset-top, 0px) + var(--space-4));
    padding: var(--space-4);
    border-radius: var(--radius);
    border: 1px solid var(--border-muted);
    background-color: var(--bg);
    max-height: calc(100dvh - 2 * var(--space-4));
    overflow-y: auto;
    box-sizing: border-box;
}

.cart-empty {
    margin: 0;
}

.cart-group + .cart-group {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-muted);
}

.cart-group h3 {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--font-md);
}

.cart-group ul {
    margin: 0 0 var(--space-3) 0;
    padding: 0;
    list-style: none;
}

.cart-group li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) 0;
}

.cart-name {
    flex: 1;
    min-width: 0;
    font-size: var(--font-sm);
    color: var(--text);
    overflow-wrap: anywhere;
}

.cart-quantity {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.cart-quantity input {
    width: 4rem;
}

.cart-group .button-link {
    width: 100%;
    justify-content: center;
    text-align: center;
}

.part-dialog input:not([type="checkbox"]), .part-dialog select {
    width: 100%;
    box-sizing: border-box;
}

.part-dialog .optional {
    color: var(--text-muted);
}

.part-dialog label.part-hidden-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
}

.part-delete {
    margin-right: auto;
}

.part-delete-confirm p {
    margin: var(--space-4) 0 0 0;
    color: var(--text);
}

/* Phones and narrow windows: the cart goes above the list */
@media (max-width: 900px) {
    .parts-layout {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--space-4);
    }

    .parts-cart {
        position: static;
        max-height: none;
        order: -1;
    }
}

@media (max-width: 900px) {
    .parts-cart.empty {
        display: none;
    }
}

/* Phones: the categories scroll sideways in one row instead of filling the screen */
@media (max-width: 600px) {
    .parts-chips {
        min-width: 0; /* fieldsets otherwise grow to fit all the chips */
        flex-wrap: nowrap;
        overflow-x: auto;
        margin-inline: calc(-1 * var(--space-4));
        padding: var(--space-1) var(--space-4);
        scrollbar-width: none;
    }

    .parts-chips .chip {
        flex-shrink: 0;
        white-space: nowrap;
    }
}

@media (max-width: 480px) {
    /* Referents have more buttons per part: let them wrap under the name */
    .parts-list li {
        flex-wrap: wrap;
    }

    .part-actions {
        margin-left: auto;
        max-width: 100%;
    }

    .stock-select {
        flex: 1 1 auto;
        width: auto;
        min-width: 0;
    }

    .add-part {
        min-width: 4.5rem;
    }

    .add-part .add-label {
        display: none;
    }
}
</style>
