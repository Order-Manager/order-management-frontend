<script>

import {
    useCurrentUser
} from "vuefire";

import { useFirestore, useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';

import { ref } from 'vue';

export default {
    props: {
        showTab: Boolean
    },
    setup() {
        const currentUser = useCurrentUser();
        const db = useFirestore();

        const userData = useDocument(doc(db, 'admins', currentUser.value.uid));
        const isAdmin = userData.value != undefined && (userData.value.isPI || userData.value.isRE);
        const showTab = ref(true);

        return {
            isAdmin, showTab
        }
    },
    methods: {
        hideTab() {
            this.showTab = false;
            this.$emit('setTabVisibility', this.showTab);
        },
        goToPage(page) {
            this.hideTab()
            this.$router.push(page)
        }
    }
}

</script>


<template>
    <div v-if="showTab">
        <div id="page-mask" v-on:click="hideTab"></div>
        <div id="side-tab">
            <a v-on:click="goToPage('/')">Orders</a>
            <a v-on:click="goToPage('/suppliers')" v-if="isAdmin">Suppliers</a>
        </div>
    </div>
</template>


<style>

#side-tab {
    position: fixed;
    top: 4rem;
    width: 20rem;
    left: 0;
    height: 100%;
    background-color: var(--color-secondary);
    z-index: 100;
    padding: 2rem 0;

    display: flex;
    flex-direction: column;
    align-items: left;
}

#side-tab a {
    padding: 1rem 0.5rem;
    font-size: 1.2rem;
    font-weight: 500;
    margin: 0 3rem 0 1rem;
    text-align: left;
    cursor: pointer;
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
