import { useMutation, useQuery } from '@tanstack/vue-query'
import { getProducts } from '@/api'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * ローディングサンプル画面専用。全画面グルグル(AppLoadingOverlay)の動作確認用に、
 * わざと 2 秒遅い取得/更新を発火させるだけの composable。
 */
export function useLoadingSample() {
  // 遅い取得通信: 2秒待ってから orval 生成関数で実 API を叩く。
  // enabled: false なので発火はボタンの refetch のみ。gcTime: 0 でキャッシュを残さない
  const slowQuery = useQuery({
    queryKey: ['loading-sample', 'slow-fetch'],
    queryFn: async ({ signal }) => {
      await sleep(2000)
      return getProducts(undefined, undefined, signal)
    },
    enabled: false,
    gcTime: 0,
  })

  // 遅い更新通信: API を使わず 2 秒待つだけ(isMutating 経由の発火を確認する用)
  const slowMutation = useMutation({
    mutationFn: () => sleep(2000),
  })

  return {
    runSlowFetch: () => slowQuery.refetch(),
    runSlowMutation: () => slowMutation.mutate(),
  }
}
