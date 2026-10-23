<script setup>
import { statusTypesToMessage, statusTypesToColor, statusTypesToIcon } from '../utils/definitions.js'

defineProps({
    status: String,
})
</script>

<template>
    <span class="status-badge" :class="statusTypesToColor[status] || 'red'">
        <span class="material-symbols-outlined" aria-hidden="true">{{ statusTypesToIcon[status] || 'help' }}</span>
        {{ statusTypesToMessage[status] || 'Unknown status' }}
    </span>
</template>
