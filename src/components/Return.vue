<script>
export default {
    methods: {
        moveBack() {
            // Go back to the previous page
            this.$router.go(-1)
        }
    }
}
</script>

<template>
    <div></div>
    <!-- <button style="padding: 0;"  v-on:click="moveBack()" v-on:keyup.enter="moveBack()">
        <span class="material-symbols-outlined" id="return-button">undo</span>
    </button> -->
</template>


<style>
    .material-symbols-outlined {
        font-variation-settings:
        'FILL' var(--color-secondary),
        'wght' 600,
        'GRAD' 0,
        'opsz' 24
    }

    #return-button {
        margin: 0;
        padding: 0.4rem 1rem;
        color: var(--color-text-primary);
    }
</style>
