<script setup>
// Dialog to add parts from the catalogue to the order being written. Orders have one supplier: while the
// order has no items yet any part can be picked (and sets the supplier), afterwards only that supplier's.
import { computed, ref } from 'vue'
import { useCollection, useFirestore } from 'vuefire'
import { collection } from 'firebase/firestore'
import { groupByCategory, matchesSearch, partLabel } from '../utils/catalog.js'
import { formatEuros } from '../utils/dates.js'

const props = defineProps({
    supplier: String,
    locked: Boolean, // the order already has items, so the supplier can't change
})
const emit = defineEmits(['add'])

const db = useFirestore()
const parts = useCollection(collection(db, 'catalog'))

const dialog = ref(null)
const search = ref('')
const searchInput = ref(null)
const added = ref({}) // part id -> how many were added while the dialog was open

function available(part) {
    return !props.locked || part.supplier === props.supplier
}

const matching = computed(() => parts.value.filter(part => !part.hidden && matchesSearch(part, search.value)))
// Parts from other suppliers are left out rather than greyed out: they can't go in this order
const groups = computed(() => groupByCategory(matching.value.filter(available)))
const otherSuppliers = computed(() => matching.value.filter(part => !available(part)).length)

function open() {
    added.value = {}
    dialog.value.showModal()
    searchInput.value.focus()
}

function pick(part) {
    emit('add', part)
    added.value[part.id] = (added.value[part.id] || 0) + 1
}

defineExpose({ open })
</script>

<template>
    <dialog ref="dialog" class="dialog catalog-picker" aria-labelledby="catalog-picker-title">
        <h2 id="catalog-picker-title">Add from the parts catalogue</h2>
        <p class="field-hint">
            <template v-if="locked">This order is for {{ supplier }}, so only {{ supplier }} parts are listed. Parts from other suppliers need their own order.</template>
            <template v-else>Picking a part sets the order's supplier.</template>
        </p>
        <label for="catalog-picker-search" class="visually-hidden">Search parts</label>
        <input id="catalog-picker-search" ref="searchInput" type="search" enterkeyhint="search" v-model="search" placeholder="Search parts..." />

        <div class="catalog-picker-list">
            <section v-for="group in groups" :key="group.category" :aria-labelledby="`picker-${group.category}`">
                <h3 :id="`picker-${group.category}`">{{ group.category }}</h3>
                <ul>
                    <li v-for="part in group.parts" :key="part.id">
                        <span class="picker-text">
                            <span class="picker-name">{{ part.name }}</span>
                            <span class="picker-meta"><span v-if="part.note">{{ part.note }} · </span>{{ part.supplier }} · {{ formatEuros(part.price) }}</span>
                        </span>
                        <button type="button" @click="pick(part)">
                            <span class="material-symbols-outlined" aria-hidden="true">{{ added[part.id] ? 'check' : 'add' }}</span>
                            <span aria-hidden="true">{{ added[part.id] ? `Added ${added[part.id]}` : 'Add' }}</span>
                            <span class="visually-hidden">Add {{ partLabel(part) }}{{ added[part.id] ? ` (added ${added[part.id]})` : '' }}</span>
                        </button>
                    </li>
                </ul>
            </section>
            <p v-if="!groups.length" role="status">{{ !parts.length ? 'The catalogue is empty for now.' : search.trim() ? `No ${locked ? supplier + ' ' : ''}parts match “${search.trim()}”.` : `No ${supplier} parts in the catalogue.` }}</p>
            <p v-if="otherSuppliers" class="field-hint picker-others">{{ otherSuppliers }} matching part{{ otherSuppliers === 1 ? '' : 's' }} from other suppliers not shown.</p>
        </div>

        <div class="dialog-actions">
            <button type="button" class="primary" @click="dialog.close()">Done</button>
        </div>
    </dialog>
</template>

<style>
.catalog-picker {
    width: min(40rem, calc(100% - 2rem));
    max-height: calc(100dvh - 2rem);
}

.catalog-picker[open] {
    display: flex;
    flex-direction: column;
}

.catalog-picker > .field-hint {
    margin-bottom: var(--space-3);
}

#catalog-picker-search {
    width: 100%;
    box-sizing: border-box;
}

.catalog-picker-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin-top: var(--space-3);
}

.catalog-picker-list h3 {
    margin: var(--space-4) 0 var(--space-2) 0;
    font-size: var(--font-sm);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.catalog-picker-list ul {
    margin: 0;
    padding: 0;
    list-style: none;
}

.catalog-picker-list li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) 0;
}

.catalog-picker-list li + li {
    border-top: 1px solid var(--border-muted);
}

.picker-others {
    margin-top: var(--space-4);
}

.picker-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.picker-name {
    color: var(--text);
}

.picker-meta {
    font-size: var(--font-sm);
    color: var(--text-muted);
}

.catalog-picker-list button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
}
</style>
