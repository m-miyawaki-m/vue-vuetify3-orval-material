import { createRouter, createWebHashHistory } from 'vue-router'
import { startNavigation, endNavigation } from '@/composables/useGlobalLoading'
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
    { path: '/sample-loading', component: () => import('@/pages/LoadingSamplePage.vue')      },
    { path: '/sdk-echo-sample', component: () => import('@/pages/SdkEchoSamplePage.vue')     },
    { path: '/quick-scan', component: () => import('@/pages/QuickScanMenuPage.vue') },
    { path: '/quick-scan/:featureId', component: () => import('@/pages/QuickScanWorkPage.vue'), props: true },
    // スキャンパターン集(sample/scan)
    { path: '/sample/scan', component: () => import('@/sample/scan/pages/ScanPatternIndexPage.vue') },
    { path: '/sample/scan/single-raw', component: () => import('@/sample/scan/pages/SingleRawScanPage.vue') },
    { path: '/sample/scan/single-raw/result', component: () => import('@/sample/scan/pages/SingleRawResultPage.vue') },
    { path: '/sample/scan/single-split', component: () => import('@/sample/scan/pages/SingleSplitScanPage.vue') },
    { path: '/sample/scan/single-split/result', component: () => import('@/sample/scan/pages/SingleSplitResultPage.vue') },
    { path: '/sample/scan/single-lookup', component: () => import('@/sample/scan/pages/SingleLookupScanPage.vue') },
    { path: '/sample/scan/single-lookup/result', component: () => import('@/sample/scan/pages/SingleLookupResultPage.vue') },
    { path: '/sample/scan/list-raw', component: () => import('@/sample/scan/pages/ListRawScanPage.vue') },
    { path: '/sample/scan/list-raw/result', component: () => import('@/sample/scan/pages/ListRawResultPage.vue') },
    { path: '/sample/scan/list-raw/result/:index', component: () => import('@/sample/scan/pages/ListRawItemDetailPage.vue') },
    { path: '/sample/scan/list-split', component: () => import('@/sample/scan/pages/ListSplitScanPage.vue') },
    { path: '/sample/scan/list-split/result', component: () => import('@/sample/scan/pages/ListSplitResultPage.vue') },
    { path: '/sample/scan/list-split/result/:index', component: () => import('@/sample/scan/pages/ListSplitItemDetailPage.vue') },
    { path: '/sample/scan/pair-single', component: () => import('@/sample/scan/pages/PairSingleScanPage.vue') },
    { path: '/sample/scan/pair-list', component: () => import('@/sample/scan/pages/PairListScanPage.vue') },
    { path: '/:pathMatch(.*)*', component: ComingSoonPage },
  ],
})

// ページ遷移中は全画面ローディングを表示する(AppLoadingOverlay が観測)
// 遷移失敗時も onError で必ず解除されるため消し忘れは起きない
router.beforeEach(() => {
  startNavigation()
})
router.afterEach(() => {
  endNavigation()
})
router.onError(() => {
  endNavigation()
})

export default router
