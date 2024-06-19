<script setup>
import TopBar from './components/TopBar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <TopBar />
  <div id="main-view">
    <router-view id="main-view"></router-view>
  </div>
  <Footer />
</template>

<style scoped>

/* Padding on active route */
div.active {
  padding: 0.5rem;
}

#main-view {
  margin-bottom: 4rem;
  padding: 0.5rem;
}

</style>
