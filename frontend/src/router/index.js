import { createRouter, createWebHistory } from 'vue-router'
import LoginScreen from '../views/LoginScreen.vue'
import VotacionsScreen from '../views/VotacionsScreen.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginScreen,
    },
    {
      path: '/votacions',
      name: 'votacions',
       component: VotacionsScreen,
    },
  ],
})

export default router
