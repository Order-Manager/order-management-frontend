<script setup>
import { getAuth, signOut } from "firebase/auth";

import { useRouter } from 'vue-router';

const auth = getAuth();
const router = useRouter();

signOut(auth).then(() => {
    console.log('Sign-out successful');
    router.push('/');
}).catch((error) => {
    console.log('Sign-out error', error);
});
</script>

<template>
    <div>
        <p>Signing Out...</p>
    </div>
</template>

<style>

</style>
