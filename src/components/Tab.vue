<script>

import { useCurrentUser, useFirestore, useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';

import { computed } from 'vue';

export default {
    emits: ['close'],
    setup() {
        const currentUser = useCurrentUser();
        const db = useFirestore();

        const userData = useDocument(computed(() => currentUser.value && doc(db, 'admins', currentUser.value.uid)));
        const isAdmin = computed(() => !!(userData.value && userData.value.isIR));

        return {
            isAdmin
        }
    },
    methods: {
        onKeydown(event) {
            if (event.key === 'Escape') this.$emit('close', true)
        }
    },
    mounted() {
        document.addEventListener('keydown', this.onKeydown)
        this.$el.querySelector('#side-tab a')?.focus()
    },
    unmounted() {
        document.removeEventListener('keydown', this.onKeydown)
    }
}

</script>


<template>
    <div>
        <div id="page-mask" @click="$emit('close', false)"></div>
        <nav id="side-tab" aria-label="Sections">
            <router-link to="/" @click="$emit('close', false)">Orders</router-link>
            <router-link to="/suppliers" v-if="isAdmin" @click="$emit('close', false)">Suppliers</router-link>
            <router-link to="/tags" v-if="isAdmin" @click="$emit('close', false)">Tags</router-link>
        </nav>
    </div>
</template>


<style>

#side-tab {
    position: fixed;
    top: 4rem;
    width: 20rem;
    max-width: 85vw;
    left: 0;
    height: 100%;
    background-color: var(--color-secondary);
    z-index: 100;
    padding: 2rem 0;

    display: flex;
    flex-direction: column;
    align-items: stretch;
}

#side-tab a {
    padding: 1rem 0.5rem;
    font-size: 1.2rem;
    font-weight: 500;
    margin: 0 3rem 0 1rem;
    text-align: left;
    color: var(--text);
    text-decoration: none;
    border-radius: 8px;
}

#side-tab a:hover, #side-tab a.router-link-exact-active {
    text-decoration: underline;
}


#page-mask {
    position: fixed;
    top: 4rem;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 99;
}

</style>
