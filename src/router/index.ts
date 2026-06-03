import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import DetailPage from '@/pages/DetailPage.vue'
import FavoritePage from '@/pages/FavoritePage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import ComponentSamplePage from '@/pages/ComponentSamplePage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           component: HomePage             },
    { path: '/search',     component: SearchPage           },
    { path: '/favorites',  component: FavoritePage         },
    { path: '/settings',   component: SettingsPage         },
    { path: '/detail/:id', component: DetailPage, props: true },
    { path: '/samples',    component: ComponentSamplePage  },
  ],
})

export default router
