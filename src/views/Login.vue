<script>
    import {
        getAuth,
        sendSignInLinkToEmail,
        signInWithEmailLink,
        isSignInWithEmailLink
    } from "firebase/auth";

    import { getCurrentUser } from "vuefire";

    import { useRoute, useRouter } from 'vue-router'

    import { useToast } from "vue-toastification";

    export default {
        data() {
            return {
                email: '',
                message: '',
                messageIsError: false,
                sending: false,
            };
        },
        methods: {
            signIn() {
                const auth = getAuth();
                const actionCodeSettings = {
                    url: window.location.href,
                    handleCodeInApp: true,
                };
                const email = this.email.trim();

                // Must match isDevinci() in firestore.rules
                if(!email.match(/^[^@\s]+@(edu\.)?devinci\.fr$/i)) {
                    this.showMessage('Please use your @devinci.fr or @edu.devinci.fr address.', true);
                    this.$refs.email.focus();
                    return;
                }

                this.sending = true;
                sendSignInLinkToEmail(auth, email, actionCodeSettings)
                    .then(() => {
                        window.localStorage.setItem('emailForSignIn', email);
                        this.showMessage(`We sent a sign-in link to ${email}. Open it on this device to sign in.`, false);
                    })
                    .catch((error) => {
                        console.log('Error', error.code, error.message);
                        this.showMessage('Could not send the sign-in link: ' + error.message, true);
                    })
                    .finally(() => {
                        this.sending = false;
                    });
            },
            showMessage(text, isError) {
                this.message = text;
                this.messageIsError = isError;
            }
        },
        setup() {
            const auth = getAuth();
            const router = useRouter();
            const route = useRoute();
            const toast = useToast();


            // Links sent by the other environment (dev vs prod) carry the other project's API key
            const linkApiKey = window.location.href.match(/[?&]apiKey=([^&#]+)/);
            if (linkApiKey && linkApiKey[1] !== auth.app.options.apiKey) {
                toast.error('This login link was sent by another version of the site. Please request a new one here.');
            } else if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');
                if (!email) {
                    email = window.prompt('Please provide your email for confirmation');
                }
                signInWithEmailLink(auth, email, window.location.href)
                    .then((result) => {
                        window.localStorage.removeItem('emailForSignIn');
                        toast.success('You are signed in.');
                        router.push(route.query.redirect || '/');
                    })
                    .catch((error) => {
                        toast.error('Could not sign you in: ' + error.message);

                    });
            } else {
                getCurrentUser().then((user) => {
                    if (user) router.push(route.query.redirect || '/');
                });
            }


            return { toast };

        }
    }
</script>

<template>
    <div class="center-column">
        <form id="login-content" class="center-column" novalidate @submit.prevent="signIn()">
            <h1>Sign in</h1>
            <label for="email">Devinci email address</label>
            <input
                ref="email"
                v-model="email"
                type="email"
                id="email"
                name="email"
                autocomplete="email"
                placeholder="firstname.lastname@devinci.fr"
                required
                :aria-invalid="messageIsError"
                aria-describedby="login-message"
            />
            <button type="submit" class="primary" :disabled="sending">{{ sending ? 'Sending…' : 'Send me a sign-in link' }}</button>
            <p id="login-message" role="status" :class="messageIsError ? 'red' : 'green'">{{ message }}</p>
        </form>
    </div>
</template>

<style scoped>
    #login-content {
        gap: 0.75rem;
        width: min(24rem, 100%);
        box-sizing: border-box;
        background-color: var(--bg);
        margin-top: calc(min(6rem, 15vh));
        padding: 2rem;
        border-radius: 0.5rem;
        border: 1px solid var(--border-muted);
        align-items: stretch;
    }

    h1 {
        margin: 0 0 0.5rem 0;
    }

    #login-message {
        margin: 0;
        min-height: 1.5em;
    }
</style>
