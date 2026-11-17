<script setup>
// Dev only: switch between your own account and the test accounts in one click (functions/main.py switchAccount).
// Shown when VITE_ACCOUNT_SWITCHERS (.env.development) lists your email, or when you are switched to a test account.
import { computed, ref, watch } from 'vue'
import { useCurrentUser, useFirebaseAuth } from 'vuefire'
import { useToast } from 'vue-toastification'
import { firebaseApp } from '../firebaseInit'

const SWITCHERS = (import.meta.env.VITE_ACCOUNT_SWITCHERS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const PERSONAS = { 'persona-student': 'student', 'persona-referent': 'referent', 'persona-admin': 'admin' }

const currentUser = useCurrentUser()
const auth = useFirebaseAuth()
const toast = useToast()
const switched = ref(false)
const busy = ref(false)

watch(currentUser, async (user) => {
    switched.value = false
    if (!SWITCHERS.length || !user) return
    const { claims } = await user.getIdTokenResult()
    switched.value = typeof claims.switcherHome === 'string'
}, { immediate: true })

const visible = computed(() => SWITCHERS.length > 0 && currentUser.value
    && (switched.value || SWITCHERS.includes((currentUser.value.email || '').toLowerCase())))
const current = computed(() => PERSONAS[currentUser.value?.uid] || 'home')

async function switchTo(event) {
    const account = event.target.value
    busy.value = true
    try {
        const { getFunctions, httpsCallable } = await import('firebase/functions')
        const { signInWithCustomToken } = await import('firebase/auth')
        const call = httpsCallable(getFunctions(firebaseApp, 'us-central1'), 'switchAccount')
        const { data } = await call({ account })
        await signInWithCustomToken(auth, data.token)
        // Reload so every page re-reads its data as the new account, on the same URL
        window.location.reload()
    } catch (error) {
        event.target.value = current.value
        toast.error('Could not switch accounts: ' + error.message)
        busy.value = false
    }
}
</script>

<template>
    <label v-if="visible" class="account-switcher">
        <span class="account-switcher-label">Test as</span>
        <select :value="current" :disabled="busy" @change="switchTo">
            <option value="home">My account</option>
            <option value="student">Test student</option>
            <option value="referent">Test referent</option>
            <option value="admin">Test admin (not a referent)</option>
        </select>
    </label>
</template>

<style>
.account-switcher {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    min-width: 0;
}

.account-switcher-label {
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.account-switcher select {
    min-height: 2.75rem;
    max-width: 16rem;
    min-width: 0;
}
</style>
