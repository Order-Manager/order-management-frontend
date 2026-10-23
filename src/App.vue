<script setup>
import TopBar from './components/TopBar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="$refs.main.focus()">Skip to content</a>
  <TopBar />
  <div id="page">
    <main id="main" ref="main" tabindex="-1">
      <!-- Keyed so going from one order to another loads the new one -->
      <router-view :key="$route.fullPath"></router-view>
    </main>
    <Footer />
  </div>
</template>

<style scoped>

#page{
  position: relative;
  min-height: calc(100vh - 4rem);
  min-height: calc(100dvh - 4rem - env(safe-area-inset-top, 0px));
}

#main {
  display: block;
  padding: 2rem max(2rem, env(safe-area-inset-right, 0px)) 6rem max(2rem, env(safe-area-inset-left, 0px));
  max-width: 100%;
}

@media (max-width: 1024px) {
  #main {
    padding: 1rem max(1rem, env(safe-area-inset-right, 0px)) 6rem max(1rem, env(safe-area-inset-left, 0px));
  }
}

</style>
