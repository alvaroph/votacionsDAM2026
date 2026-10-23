<script setup>
const props = defineProps(['voteCount', 'idOption'])
const emit = defineEmits(['votar'])

function vote(){
  emit('votar', props.idOption);
}
</script>

<template>
   <v-card class="boto-votar-card">
    <v-card-title><slot></slot></v-card-title>
    <v-card-text>
      <p class="text-h4">{{ voteCount }}</p>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" @click="vote">Votar</v-btn>
    </v-card-actions>
  </v-card>
</template>

<style>
</style>