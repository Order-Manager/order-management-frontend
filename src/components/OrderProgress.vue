<script setup>
import { computed } from 'vue'

const props = defineProps({
    status: String,
})

const STEPS = ['Submitted', 'Approved', 'Ordered', 'Delivered', 'Picked up']

// Index of the last step reached for each status: that step and the ones before it get a tick,
// and the step after it is the one in progress
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
    if (index <= reached.value) return 'done'
    if (index === reached.value + 1) return 'next'
    return 'upcoming'
}

const caption = computed(() => {
    if (reached.value < 0) return `Not submitted yet · next: ${STEPS[0]}`
    if (reached.value === STEPS.length - 1) return `${STEPS[reached.value]} · all done`
    return `${STEPS[reached.value]} · next: ${STEPS[reached.value + 1]}`
})
</script>

<template>
    <ol class="order-progress" aria-label="Order progress">
        <li
            v-for="(label, index) in STEPS"
            :key="label"
            :class="state(index)"
            :aria-current="state(index) === 'next' ? 'step' : null"
        >
            <span class="progress-dot" aria-hidden="true">
                <span class="material-symbols-outlined" v-if="state(index) === 'done'">check</span>
            </span>
            <span class="progress-label">
                {{ label }}<span class="visually-hidden">{{ state(index) === 'done' ? ' (done)' : state(index) === 'next' ? ' (next step)' : '' }}</span>
            </span>
        </li>
    </ol>
    <!-- Narrow screens show the dots only, with where the order stands spelled out once -->
    <p class="progress-caption" aria-hidden="true">{{ caption }}</p>
</template>

<style>
.order-progress {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
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
    min-width: 0;
    overflow-wrap: anywhere;
}

.progress-caption {
    display: none;
    margin: calc(-1 * var(--space-3)) 0 0 0;
    text-align: center;
    color: var(--text);
    font-weight: 700;
}

@media (max-width: 30rem) {
    .progress-label {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
    }

    .progress-caption {
        display: block;
    }
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

/* Solid between reached steps, dashed teal into the step in progress */
.order-progress li.done + li.done::before {
    background-color: var(--link);
}

.order-progress li.next::before {
    background: repeating-linear-gradient(90deg, var(--link) 0 6px, transparent 6px 10px);
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

.order-progress li.next .progress-dot {
    border-color: var(--link);
    box-shadow: 0 0 0 4px color-mix(in oklch, var(--link) 30%, transparent);
}

.order-progress li.next,
.order-progress li.done {
    color: var(--text);
}

.order-progress li.next {
    font-weight: 700;
}
</style>
