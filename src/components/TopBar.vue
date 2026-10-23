<script>
import { useCurrentUser } from 'vuefire'

import { ref } from 'vue'

import Tab from './Tab.vue'

const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

export default {
    components: {
        Tab
    },
    methods: {
        openTab() {
            this.showTab = true
        },
        closeTab(returnFocus) {
            this.showTab = false
            if (returnFocus) this.$nextTick(() => this.$refs.menuButton.focus())
        },
        toggleShowTab() {
            if (this.showTab) this.closeTab(false)
            else this.openTab()
        },
        toggleTheme() {
            // An explicit choice overrides the system setting from now on
            this.theme = this.theme === 'dark' ? 'light' : 'dark'
            document.documentElement.dataset.theme = this.theme
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
        const showTab = ref(false); // Reactive variable to control side tab visibility

        const theme = ref(document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light'))
        systemDark.addEventListener('change', (e) => {
            if (!document.documentElement.dataset.theme) theme.value = e.matches ? 'dark' : 'light'
        })

        return {
            currentUser, showTab, theme
        }
    }
}

</script>

<template>
    <header>
        <nav aria-label="Main">
            <div id="left-nav-section">
                <button
                    ref="menuButton"
                    type="button"
                    class="icon-button"
                    aria-label="Menu"
                    aria-controls="side-tab"
                    :aria-expanded="showTab"
                    @click="toggleShowTab()"
                >
                    <span class="material-symbols-outlined" aria-hidden="true">menu</span>
                </button>
                <router-link to="/" class="home-link" aria-label="IFT Orders, home">
                    <svg aria-hidden="true" width="32" height="33" viewBox="0 0 32 33" xmlns="http://www.w3.org/2000/svg"><path d="M10.0811 8.4182L5.83462 0.190918H2.99992L9.67261 13.1182C10.5858 12.4441 10.9873 10.1747 10.0811 8.4182Z" fill="#007F7F"></path><path d="M15.718 2.23543L13.1494 7.23357C13.1494 7.23357 10.7002 3.40679 11.9444 1.22143C12.9961 -0.412105 14.5318 0.34164 14.7541 0.518363C14.9764 0.694577 15.652 1.06534 15.718 2.23543Z" fill="#007F7F"></path><path d="M4.56792 32.1182H0.919922V16.5902H4.56792V32.1182Z" fill="var(--text-muted)"></path><path d="M18.2125 19.4222H12.3325V22.7822H17.9245V25.5662H12.3325V32.1182H8.68448V16.5902H18.2125V19.4222Z" fill="var(--text-muted)"></path><path d="M31.774 19.4222H27.67V32.1182H23.998V19.4222H19.894V16.5902H31.774V19.4222Z" fill="var(--text-muted)"></path></svg>
                </router-link>
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
                <p v-if="currentUser">{{ currentUser.email }}</p>
                <router-link v-if="currentUser" to="/signout" class="button-link">Sign out</router-link>
                <router-link v-else to="/login" class="button-link">Sign in</router-link>
            </div>
        </nav>
    </header>

    <Tab v-if="showTab" @close="closeTab" />
</template>


<style>
    header > nav {
        top: 0;
        left: 0;
        max-width: 100%;
        width: calc(100% - 2rem);
        height: 4rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0;
        padding: 0 1rem;
        background-color: var(--bg-dark);
        z-index: 100;
    }

    #left-nav-section {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .home-link {
        display: inline-flex;
        align-items: center;
        min-height: 2.75rem;
        padding: 0 0.25rem;
        border-radius: 8px;
    }

    #right-nav-section {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    #right-nav-section p {
        color: var(--color-text-secondary);
    }

    @media (max-width: 1024px) {
        header > nav {
            padding: 0 1rem;
            width: calc(100% - 1rem);
        }

        #left-nav-section {
            gap: 0.5rem;
        }

        #right-nav-section {
            margin-right: 0.5rem;
        }
    }

</style>
