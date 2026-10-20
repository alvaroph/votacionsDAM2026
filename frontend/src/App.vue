<script setup>
import {  RouterView } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

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
<v-main>
<RouterView />

</v-main>
  
  </v-app>
</template>

<style scoped>
</style>
