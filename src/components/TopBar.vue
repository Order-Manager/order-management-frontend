<script>
import { useCurrentUser } from 'vuefire'

export default {
    methods: {
        login() {
            this.$router.push('/login')
        },
        signOut() {
            this.$router.push('/signOut')
        }
    },
    setup() {
        const user = useCurrentUser();
        return {
            user
        }
    }
}

</script>


<template>
    <nav>
        <a href="/">
            <svg class="w-8 bg-none text-zinc-950 fill-current" width="32" height="33" viewBox="0 0 32 33" xmlns="http://www.w3.org/2000/svg"><path d="M10.0811 8.4182L5.83462 0.190918H2.99992L9.67261 13.1182C10.5858 12.4441 10.9873 10.1747 10.0811 8.4182Z" fill="#007F7F"></path><path d="M15.718 2.23543L13.1494 7.23357C13.1494 7.23357 10.7002 3.40679 11.9444 1.22143C12.9961 -0.412105 14.5318 0.34164 14.7541 0.518363C14.9764 0.694577 15.652 1.06534 15.718 2.23543Z" fill="#007F7F"></path><path d="M4.56792 32.1182H0.919922V16.5902H4.56792V32.1182Z"></path><path d="M18.2125 19.4222H12.3325V22.7822H17.9245V25.5662H12.3325V32.1182H8.68448V16.5902H18.2125V19.4222Z"></path><path d="M31.774 19.4222H27.67V32.1182H23.998V19.4222H19.894V16.5902H31.774V19.4222Z"></path></svg>
        </a>
        <div id="right-nav-section">
            <!-- <label class="switch">
                <input type="checkbox" />
                <span class="slider round"></span>
            </label> -->
            <p v-if="user">{{ user.email }}</p>
            <button id="login-button" class="alt-button" v-on:click="login()" v-if="user == undefined">Login</button>
            <button id="login-button" class="alt-button" v-on:click="signOut()" v-if="user">Sign Out</button>
        </div>
    </nav>
</template>


<style>
    nav {
        max-width: 100%;
        height: 4rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 2em;
        background-color: var(--color-primary);
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 1024px) {
        nav {
            padding: 0 1em;
        }
    }

    #right-nav-section {
        display: flex;
        align-items: center;
    }

    #right-nav-section p {
        color: var(--color-text-secondary);
        margin-right: 1em;
    }
</style>
