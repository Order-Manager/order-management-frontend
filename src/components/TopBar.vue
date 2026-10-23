<script>
import { useCurrentUser, useDocument, useFirestore } from 'vuefire'
import { doc } from 'firebase/firestore'

import { computed, ref } from 'vue'

import Tab from './Tab.vue'

const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

export default {
    components: {
        Tab
    },
    methods: {
        closeTab(returnFocus) {
            this.showTab = false
            if (returnFocus) this.$nextTick(() => this.$refs.menuButton.focus())
        },
        toggleShowTab() {
            this.showTab = !this.showTab
        },
        toggleTheme() {
            // An explicit choice overrides the system setting from now on
            this.theme = this.theme === 'dark' ? 'light' : 'dark'
            document.documentElement.dataset.theme = this.theme
            // Keep the phone status bar in step (same colours as in index.html)
            document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.content = this.theme === 'dark' ? '#181818' : '#e4e4e4')
            try { localStorage.setItem('theme', this.theme) } catch (e) {}
        }
    },
    watch: {
        $route() {
            this.showTab = false
        }
    },
    setup() {
        const currentUser = useCurrentUser();
        const db = useFirestore();
        const showTab = ref(false); // Phone menu visibility

        const userData = useDocument(computed(() => currentUser.value && doc(db, 'admins', currentUser.value.uid)));
        const links = computed(() => [
            { to: '/', label: 'Orders' },
            ...(userData.value && userData.value.isIR ? [
                { to: '/suppliers', label: 'Suppliers' },
                { to: '/tags', label: 'Tags' },
            ] : []),
        ]);

        const theme = ref(document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light'))
        systemDark.addEventListener('change', (e) => {
            if (!document.documentElement.dataset.theme) theme.value = e.matches ? 'dark' : 'light'
        })

        return {
            currentUser, showTab, theme, links
        }
    }
}

</script>

<template>
    <header id="top-bar">
        <nav aria-label="Main">
            <div id="left-nav-section">
                <router-link to="/" class="home-link" aria-label="IFT Orders, home">
                    <svg aria-hidden="true" width="32" height="33" viewBox="0 0 32 33" xmlns="http://www.w3.org/2000/svg"><path d="M10.0811 8.4182L5.83462 0.190918H2.99992L9.67261 13.1182C10.5858 12.4441 10.9873 10.1747 10.0811 8.4182Z" fill="#007F7F"></path><path d="M15.718 2.23543L13.1494 7.23357C13.1494 7.23357 10.7002 3.40679 11.9444 1.22143C12.9961 -0.412105 14.5318 0.34164 14.7541 0.518363C14.9764 0.694577 15.652 1.06534 15.718 2.23543Z" fill="#007F7F"></path><path d="M4.56792 32.1182H0.919922V16.5902H4.56792V32.1182Z" fill="var(--text-muted)"></path><path d="M18.2125 19.4222H12.3325V22.7822H17.9245V25.5662H12.3325V32.1182H8.68448V16.5902H18.2125V19.4222Z" fill="var(--text-muted)"></path><path d="M31.774 19.4222H27.67V32.1182H23.998V19.4222H19.894V16.5902H31.774V19.4222Z" fill="var(--text-muted)"></path></svg>
                </router-link>
                <ul v-if="currentUser" class="nav-links wide-only">
                    <li v-for="link in links" :key="link.to">
                        <router-link :to="link.to" class="nav-link">{{ link.label }}</router-link>
                    </li>
                </ul>
            </div>
            <div id="right-nav-section">
                <button
                    type="button"
                    class="icon-button"
                    :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
                    @click="toggleTheme()"
                >
                    <span class="material-symbols-outlined" aria-hidden="true">{{ theme === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
                </button>
                <template v-if="currentUser">
                    <p class="wide-only user-email">{{ currentUser.email }}</p>
                    <router-link to="/signout" class="button-link wide-only">Sign out</router-link>
                    <button
                        ref="menuButton"
                        type="button"
                        class="icon-button narrow-only"
                        aria-label="Menu"
                        aria-controls="side-tab"
                        :aria-expanded="showTab"
                        @click="toggleShowTab()"
                    >
                        <span class="material-symbols-outlined" aria-hidden="true">{{ showTab ? 'close' : 'menu' }}</span>
                    </button>
                </template>
                <router-link v-else to="/login" class="button-link">Sign in</router-link>
            </div>
        </nav>
    </header>

    <Tab v-if="showTab" :links="links" :email="currentUser && currentUser.email" @close="closeTab" />
</template>


<style>
    #top-bar {
        position: sticky;
        top: 0;
        z-index: 100;
        padding-top: env(safe-area-inset-top, 0px);
        background-color: var(--bg-dark);
        border-bottom: 1px solid var(--border-muted);
    }

    #top-bar > nav {
        height: 4rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin: 0;
        padding: 0 max(1rem, env(safe-area-inset-right, 0px)) 0 max(1rem, env(safe-area-inset-left, 0px));
    }

    #left-nav-section {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        min-width: 0;
    }

    .home-link {
        display: inline-flex;
        align-items: center;
        min-height: 2.75rem;
        padding: 0 0.25rem;
        border-radius: 8px;
    }

    .nav-links {
        display: flex;
        gap: 0.25rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .nav-link {
        display: inline-flex;
        align-items: center;
        min-height: 2.75rem;
        padding: 0 0.75rem;
        border-radius: 8px;
        color: var(--text-muted);
        text-decoration: none;
    }

    .nav-link.router-link-exact-active {
        color: var(--text);
        text-decoration: underline;
        text-decoration-color: var(--link);
        text-decoration-thickness: 2px;
        text-underline-offset: 0.4em;
    }

    #right-nav-section {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
    }

    .user-email {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--color-text-secondary);
    }

    /* Header layout switches by available width: inline links on wide screens, a menu on narrow ones */
    @media (max-width: 47.99rem) {
        .wide-only {
            display: none !important;
        }
    }

    @media (min-width: 48rem) {
        .narrow-only {
            display: none !important;
        }
    }

    @media (hover: hover) and (pointer: fine) {
        .nav-link:hover {
            color: var(--text);
        }
    }

</style>
