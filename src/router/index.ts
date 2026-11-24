import { createRouter, createWebHistory } from 'vue-router'
import BatchPage from '../views/BatchPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/batches/B-104' },
    { path: '/batches/:id', component: BatchPage, props: true },
  ],
})

export default router
