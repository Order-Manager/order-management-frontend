import { ref } from 'vue'
import { supabase } from './supabaseClient'

export async function signInWithEmail(email) {
    const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            // set this to false if you do not want the user to be automatically signed up
            shouldCreateUser: true,
            emailRedirectTo: 'http://localhost:5173/login',
        },
    })
    return { data, error }
}

export async function validateOTP(token_hash, type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    return { error }
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}
/**
 * Get the current session.
 * More info on return data : https://supabase.com/docs/reference/javascript/auth-getsession
 * @returns {Promise} session data
 */
export async function getCurrentUser() {
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
}

export async function useCurrentUser() {
    const { data, error } = await getCurrentUser()
    if (error) {
        console.error(error)
        return null
    }
    let ret = ref(data)
    return ret
}