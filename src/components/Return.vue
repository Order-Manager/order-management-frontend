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
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <div>
        <span class="material-symbols-outlined" id="return-button" v-on:click="moveBack()">undo</span>
    </div>
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
        margin-bottom: 1rem;
        color: var(--color-text-primary);
        border-radius: 1rem;
        padding: 0.4em 0.6em;
        background-color: #f9f9f9;
        cursor: pointer;
        transition: border-color 0.25s;

    }
</style>
