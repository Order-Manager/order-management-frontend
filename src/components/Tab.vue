<script>

// Phone menu: drops down under the top bar with the section links and the account
export default {
    emits: ['close'],
    props: {
        links: Array,
        email: String,
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
            <ul>
                <li v-for="link in links" :key="link.to">
                    <router-link :to="link.to" @click="$emit('close', false)">{{ link.label }}</router-link>
                </li>
            </ul>
            <div id="side-tab-account">
                <p>Signed in as <strong>{{ email }}</strong></p>
                <router-link to="/signout" class="button-link" @click="$emit('close', false)">Sign out</router-link>
            </div>
        </nav>
    </div>
</template>


<style>

#side-tab {
    position: fixed;
    top: calc(4rem + env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    max-height: calc(100dvh - 4rem - env(safe-area-inset-top, 0px));
    overflow-y: auto;
    overscroll-behavior: contain;
    background-color: var(--bg);
    border-bottom: 1px solid var(--border-muted);
    z-index: 100;
    padding: 0.5rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px)) 1rem;
}

#side-tab ul {
    margin: 0;
    padding: 0;
    list-style: none;
}

#side-tab li a {
    display: flex;
    align-items: center;
    min-height: 3rem;
    padding: 0 0.5rem;
    font-size: 1.2rem;
    color: var(--text);
    text-decoration: none;
    border-radius: 8px;
}

#side-tab li a.router-link-exact-active {
    text-decoration: underline;
    text-decoration-color: var(--link);
    text-decoration-thickness: 2px;
    text-underline-offset: 0.4em;
}

#side-tab-account {
    margin-top: 0.5rem;
    padding: 1rem 0.5rem 0 0.5rem;
    border-top: 1px solid var(--border-muted);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
}

#side-tab-account p {
    margin: 0;
    overflow-wrap: anywhere;
}

#page-mask {
    position: fixed;
    top: calc(4rem + env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 99;
}

</style>
