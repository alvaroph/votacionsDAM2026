<script setup>
import {  RouterView } from 'vue-router'

</script>

<template>
  <v-app>
  <header>
   
    <div class="wrapper">
      <nav>
        <v-btn  to="/">Login</v-btn>
        <v-btn  to="/votacions">Votacions</v-btn>
      </nav>
    </div>
  </header>

  <RouterView />

  </v-app>
</template>

<style scoped></style>
