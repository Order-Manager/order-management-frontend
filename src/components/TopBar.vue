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
        <div>
            <label class="switch">
                <input type="checkbox" />
                <span class="slider round"></span>
            </label>
        </div>
        <div id="right-nav-section">
            <p v-if="user">{{ user.email }}</p>
            <button id="login-button" class="alt-button" v-on:click="login()" v-if="user == undefined">Login</button>
            <button id="login-button" class="alt-button" v-on:click="signOut()" v-if="user">Sign Out</button>
        </div>
    </nav>
</template>


<style>
    nav {
        max-width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1em 2em;
        background-color: var(--color-primary);
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    #right-nav-section {
        display: flex;
        align-items: center;
    }

    #right-nav-section p {
        color: var(--color-text-secondary);
        margin-right: 1em;
    }

    /* The switch - the box around the slider */
    .switch {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
    }

    /* Hide default HTML checkbox */
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    /* The slider */
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-secondary);
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: var(--color-primary);
        -webkit-transition: 0.4s;
        transition: 0.4s;
    }

    input:checked+.slider {
        background-color: var(--color-text-primary);
    }

    input:focus+.slider {
        box-shadow: 0 0 1px var(--color-text-primary);
    }

    input:checked+.slider:before {
        -webkit-transform: translateX(26px);
        -ms-transform: translateX(26px);
        transform: translateX(26px);
    }

    /* Rounded sliders */
    .slider.round {
        border-radius: 34px;
    }

    .slider.round:before {
        border-radius: 50%;
    }
</style>
