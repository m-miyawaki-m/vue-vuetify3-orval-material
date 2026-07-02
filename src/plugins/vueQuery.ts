import { QueryCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { App } from 'vue'
import { ApiError } from '@/api/apiError'
import { useSnackbar } from '@/composables/useSnackbar'

/** アプリ全体のクエリ方針を一箇所で定義する */
export function createAppQueryClient(): QueryClient {
  const { showSnack } = useSnackbar()
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        const message =
          error instanceof ApiError ? error.message : 'データの取得に失敗しました'
        showSnack('error', message)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5分: ページまたぎの再フェッチを抑制
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function registerVueQuery(app: App) {
  app.use(VueQueryPlugin, { queryClient: createAppQueryClient() })
}
