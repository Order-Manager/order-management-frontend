<script setup>
import { relativeDate, fullDate, isoDate } from '../utils/dates.js'

defineProps({
    // A Firestore Timestamp or a Date
    value: Object,
})
</script>

<template>
    <time :datetime="isoDate(value)" :title="fullDate(value)">{{ relativeDate(value) }}</time>
</template>
