<script setup>
import {  RouterView } from 'vue-router'

</script>

<template>
  <header>
   
    <div class="wrapper">
      <nav>
        <v-btn  to="/">Home</v-btn>
        <v-btn  to="/votacions">About</v-btn>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped></style>
