import { createRouter, createWebHashHistory } from 'vue-router'
import QuickMenuPage from '@/pages/QuickMenuPage.vue'
import MainMenuPage from '@/pages/MainMenuPage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import DetailPage from '@/pages/DetailPage.vue'
import FavoritePage from '@/pages/FavoritePage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import ComponentSamplePage from '@/pages/ComponentSamplePage.vue'
import ScannerPage from '@/pages/ScannerPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           component: QuickMenuPage        },
    { path: '/menu',       component: MainMenuPage         },
    { path: '/search',     component: SearchPage           },
    { path: '/favorites',  component: FavoritePage         },
    { path: '/settings',   component: SettingsPage         },
    { path: '/detail/:id', component: DetailPage, props: true },
    { path: '/samples',    component: ComponentSamplePage  },
    { path: '/scanner',    component: ScannerPage          },
  ],
})

export default router
