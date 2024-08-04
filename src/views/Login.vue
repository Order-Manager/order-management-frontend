<script>
import { getCurrentUser, signInWithEmail, validateOTP } from '../lib/utils';

import { useRouter } from 'vue-router'



export default {
    methods: {
        async signIn() {
            const email = document.getElementById('email').value;
            const errorMessage = document.getElementById('error');
            const successMessage = document.getElementById('success');

            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
            successMessage.textContent = '';
            successMessage.style.display = 'none';

            if (!email.match(/.+devinci\.fr/)) {
                errorMessage.textContent = 'Please enter a valid email address';
                errorMessage.style.display = 'block';
                return;
            }

            let { data, error } = await signInWithEmail(email)

            if (error) {
                const errorCode = error.code;
                const message = error.message;
                console.log('Error', errorCode, message);
            } else {
                window.localStorage.setItem('emailForSignIn', email);
                successMessage.textContent = 'A login link has been sent to your email address. Please check your inbox.';
                successMessage.style.display = 'block';
            }
        }
    },
    async setup() {
        if (window.localStorage.getItem('emailForSignIn')) {
            document.getElementById('email').value = window.localStorage.getItem('emailForSignIn');
            const params = new URLSearchParams(window.location.href);
            await validateOTP(params.get('access_token'), params.get('type'));
            window.localStorage.removeItem('emailForSignIn');
        }

        let { data, error } = await getCurrentUser();
        if (data.session) {
            const router = useRouter();
            router.push('/');
        }
    }
}
</script>

<template>
    <div id="mask"></div>
    <div class="center-column full-size">
        <div id="login-content" class="center-column">
            <input type="email" id="email" placeholder="Email" pattern=".+devinci\.fr" required />
            <p id="email-error" class="error-message">Please enter a valid email address</p>
            <button id="login-button" v-on:click="signIn()">Login</button>
        </div>
        <p id="error" class="login-message error-message"></p>
        <p id="success" class="login-message success-message"></p>
    </div>
</template>

<style>
#mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 100;
}

#login-content {
    z-index: 101;
    /* width: 8rem; */
    height: 6rem;
    background-color: var(--color-primary);
    margin-top: calc(min(10rem, 25vh));
    padding: 2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-radius: 0.5rem;
}

.login-message {
    z-index: 101;
}


input:invalid {
    border: 1px solid red;
}

.error-message {
    display: none;
    color: rgb(255, 133, 133);
}

.success-message {
    display: none;
    color: rgb(152, 255, 152);
}
</style>
