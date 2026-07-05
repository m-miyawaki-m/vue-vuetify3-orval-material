import { createRouter, createWebHashHistory } from 'vue-router'
import ComingSoonPage from '@/pages/ComingSoonPage.vue'
import QuickMenuPage from '@/pages/QuickMenuPage.vue'
import MainMenuPage from '@/pages/MainMenuPage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import ProductListPage from '@/pages/ProductListPage.vue'
import DetailPage from '@/pages/DetailPage.vue'
import FavoritePage from '@/pages/FavoritePage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import ScannerPage from '@/pages/ScannerPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           component: QuickMenuPage   },
    { path: '/menu',       component: MainMenuPage    },
    { path: '/search',     component: SearchPage      },
    { path: '/products',   component: ProductListPage },
    { path: '/favorites',  component: FavoritePage    },
    { path: '/settings',   component: SettingsPage    },
    { path: '/detail/:id', component: DetailPage, props: true },
    { path: '/scanner',    component: ScannerPage     },
    { path: '/stock-search',   component: () => import('@/pages/StockSearchPage.vue')        },
    { path: '/scan-list',      component: () => import('@/pages/ScanListPage.vue')           },
    { path: '/scan-mode',      component: () => import('@/pages/ScanModePage.vue')           },
    { path: '/card-samples',   component: () => import('@/pages/CardSamplePage.vue')         },
    { path: '/scanner-sample', component: () => import('@/pages/ScannerSamplePage.vue')      },
    { path: '/sample-input',   component: () => import('@/pages/InputDisplaySamplePage.vue') },
    { path: '/sample-dialog',  component: () => import('@/pages/DialogNotifySamplePage.vue') },
    { path: '/:pathMatch(.*)*', component: ComingSoonPage },
  ],
})

export default router
