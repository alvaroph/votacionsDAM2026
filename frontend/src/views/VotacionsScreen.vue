<script setup>
import { ref } from 'vue'
import {  useRouter } from 'vue-router'
const route = useRouter()

import { useAppStore } from '@/stores/app'
import botoVotar from '@/components/botoVotar.vue'
import { onMounted } from 'vue'
const options = ref(['Opció 1', 'Opció 2', 'Opció 3', 'Opció 4']);
   const store = useAppStore()

onMounted(() => {
    if ( store.isLoggedIn==false){
        alert("No has fet login!")
        route.push('/')
      }
    })
</script>


<template>
  <div >
  
     <v-row>
      <v-col v-for="(option, index) in options" :key="index" cols="12" sm="6" md="3">
        <botoVotar
          :voteCount="store.votos[index]"
          @votar="gestioVot"
        >
        {{option}}
        </botoVotar>
      </v-col>
    </v-row>
    Votacions
  </div>
</template>

<style>

</style>
