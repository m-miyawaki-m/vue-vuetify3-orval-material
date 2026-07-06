import { computed, ref, type ComputedRef } from 'vue'
import { useIsFetching, useIsMutating } from '@tanstack/vue-query'

// ページ遷移中フラグ(モジュールスコープ: router ガードと全コンポーネントで共有)
const isNavigating = ref(false)

/** router.beforeEach から呼ぶ */
export function startNavigation() {
  isNavigating.value = true
}

/** router.afterEach / router.onError から呼ぶ */
export function endNavigation() {
  isNavigating.value = false
}

/**
 * 全画面ローディング(グルグル)の表示状態。
 * vue-query の通信中カウントとページ遷移中フラグを合成した読み取り専用の状態を返す。
 * 手動 show/hide は設けない(すべて状態の観測で決まるため、消し忘れが構造的に発生しない)。
 *
 * - グルグルを出したくないクエリには meta: { globalLoading: false } を付けると対象外になる
 * - useIsFetching/useIsMutating は QueryClient を inject するため、コンポーネントの setup 内から呼ぶこと
 */
export function useGlobalLoading(): { isLoading: ComputedRef<boolean> } {
  const fetching = useIsFetching({
    predicate: (query) => query.meta?.globalLoading !== false,
  })
  const mutating = useIsMutating()
  const isLoading = computed(
    () => isNavigating.value || fetching.value > 0 || mutating.value > 0,
  )
  return { isLoading }
}
