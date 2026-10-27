<script setup>
import { ref } from 'vue'
import {  useRouter } from 'vue-router'
const route = useRouter()
import botoVotar from '@/components/botoVotar.vue'
import { onMounted , onUnmounted } from 'vue'
import ChartComponent from '@/components/ChartComponent.vue';
//PINIA
import { useAppStore } from '@/stores/app'
const store = useAppStore()

//WBSOCKETS
import WebSocketService from '@/services/WebSocketService';
let wsService;

const options = ref(['Opció 1', 'Opció 2', 'Opció 3', 'Opció 4']);

onMounted(() => {
    if ( store.isLoggedIn==false){
        alert("No has fet login!")
        route.push('/')
      }
      // En dev la URL ve de .env.development; en producció nginx fa de proxy a /ws del mateix host
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}://${location.host}/ws`;
      wsService = new WebSocketService(wsUrl);
      wsService.connect();
    })

onUnmounted(() => {
  if (wsService) {
    wsService.disconnect();
  }
});

function gestioVot(id){
  console.log("vot")
  if (id !== -1 && wsService) {
    console.log('Vot enviat a ' + id)
    wsService.sendVote(id);
  }
}
</script>


<template>
  <div >
  
     <v-row>
      <v-col cols="12">
        GRAFICS
        <ChartComponent />
      </v-col>
    </v-row>

     <v-row>
      <v-col v-for="(actual, index) in options" :key="index" cols="12" sm="6" md="3">
        <botoVotar
          :voteCount="store.votos[index]"
          :idOption="index"
          @votar="gestioVot"
        >
        {{actual}}
        </botoVotar>
      </v-col>
    </v-row>
    Votacions
  </div>
</template>

<style>

</style>
