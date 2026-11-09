<script setup>
// The lab's rough stock of a catalogue part: icon and text, so it never relies on colour alone
import { computed } from 'vue'
import { STOCK_LEVELS } from '../utils/catalog.js'

const props = defineProps({
    stock: String,
    compact: Boolean, // icon only, with the text for screen readers and as a tooltip
})

const level = computed(() => STOCK_LEVELS[props.stock])
</script>

<template>
    <span v-if="level && compact" class="stock-icon" :class="level.color" :title="level.item">
        <span class="material-symbols-outlined" aria-hidden="true">{{ level.icon }}</span>
        <span class="visually-hidden">{{ level.item }}</span>
    </span>
    <span v-else-if="level" class="status-badge stock-badge" :class="level.color">
        <span class="material-symbols-outlined" aria-hidden="true">{{ level.icon }}</span>
        {{ level.label }}
    </span>
</template>

<style>
.stock-icon {
    display: inline-flex;
    vertical-align: middle;
}

.stock-icon .material-symbols-outlined {
    font-size: 1.25rem;
}
</style>
