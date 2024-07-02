<script setup>
import TopBar from './components/TopBar.vue'
import Footer from './components/Footer.vue'
</script>

<template>

  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

  <TopBar />
  <div id="page">
    <div id="main-view">
      <router-view></router-view>
    </div>
    <Footer />
  </div>
</template>

<style scoped>

/* Padding on active route */
div.active {
  padding: 1rem;
}

#page{
  position: relative;
  min-height: calc(100vh - 4rem);
}

#main-view {
  padding: 2rem 2rem 6rem 2rem;
  max-width: 100%;
}

@media (max-width: 1024px) {
  #main-view {
    padding: 2rem 0.5rem 6rem 0.5rem;
  }
}

</style>
