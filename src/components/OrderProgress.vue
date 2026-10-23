<script setup>
import { computed } from 'vue'

const props = defineProps({
    status: String,
})

const STEPS = ['Submitted', 'Approved', 'Ordered', 'Delivered', 'Picked up']

// Index of the last step reached for each status
const REACHED = {
    draft: -1,
    pendingIR: 0,
    approvedIR: 1,
    processingOrder: 1,
    ordered: 2,
    received: 3,
    completed: 4,
}

const reached = computed(() => REACHED[props.status] ?? -1)

function state(index) {
    if (index < reached.value || props.status === 'completed') return 'done'
    if (index === reached.value) return 'current'
    return 'upcoming'
}
</script>

<template>
    <ol class="order-progress" aria-label="Order progress">
        <li
            v-for="(label, index) in STEPS"
            :key="label"
            :class="state(index)"
            :aria-current="state(index) === 'current' ? 'step' : null"
        >
            <span class="progress-dot" aria-hidden="true">
                <span class="material-symbols-outlined" v-if="state(index) === 'done'">check</span>
            </span>
            <span class="progress-label">
                {{ label }}<span class="visually-hidden">{{ state(index) === 'done' ? ' (done)' : state(index) === 'current' ? ' (current step)' : '' }}</span>
            </span>
        </li>
    </ol>
</template>

<style>
.order-progress {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    margin: 0;
    padding: 0;
    list-style: none;
}

.order-progress li {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
    font-size: var(--font-sm);
    color: var(--text-muted);
}

/* Connector to the previous step */
.order-progress li + li::before {
    content: "";
    position: absolute;
    top: 0.75rem;
    right: 50%;
    width: 100%;
    height: 2px;
    background-color: var(--border-muted);
}

.order-progress li.done + li::before {
    background-color: var(--link);
}

.progress-dot {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 2px solid var(--border);
    background-color: var(--bg);
    box-sizing: border-box;
}

.progress-dot .material-symbols-outlined {
    font-size: 1rem;
}

.order-progress li.done .progress-dot {
    border-color: var(--link);
    background-color: var(--link);
    color: var(--bg-dark);
}

.order-progress li.current .progress-dot {
    border-color: var(--link);
    box-shadow: 0 0 0 4px color-mix(in oklch, var(--link) 30%, transparent);
}

.order-progress li.current,
.order-progress li.done {
    color: var(--text);
}

.order-progress li.current {
    font-weight: 700;
}
</style>
