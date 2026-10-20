<script setup>

import {  useRouter } from 'vue-router'
const route = useRouter()

import { useAppStore } from '@/stores/app'
import botoVotar from '@/components/botoVotar.vue'

import { onMounted } from 'vue'
 
onMounted(() => {
   const store = useAppStore()
    if ( store.isLoggedIn==false){
        alert("No has fet login!")
        route.push('/')
      }
    })
</script>


<template>
  <div >
  
    <botoVotar voteCount="0">OPCIO 1</botoVotar>
    <botoVotar voteCount="4">OPCIO 2</botoVotar>
    <botoVotar>OPCIO 3</botoVotar>
    <botoVotar>OPCIO 4</botoVotar>
    
    Votacions
  </div>
</template>

<style>

</style>
