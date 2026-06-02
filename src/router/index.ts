import { createRouter, createWebHashHistory } from 'vue-router'
import MenuPage from '@/pages/MenuPage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import DetailPage from '@/pages/DetailPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: MenuPage },
    { path: '/search', component: SearchPage },
    { path: '/detail/:id', component: DetailPage, props: true },
  ],
})

export default router
