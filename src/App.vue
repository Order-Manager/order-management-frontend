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
}

#main {
  display: block;
  padding: 2rem 2rem 6rem 2rem;
  max-width: 100%;
}

@media (max-width: 1024px) {
  #main {
    padding: 1rem 0.5rem 6rem 0.5rem;
  }
}

</style>
