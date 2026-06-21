import { ref, watch, type Ref, type WatchSource } from 'vue'

/**
 * 非同期データ取得の状態（loading / error / data）を管理する汎用 composable。
 *
 * @param fn    実行する非同期関数
 * @param deps  変化を監視する依存（変化するたびに fn を再実行）
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps?: WatchSource | WatchSource[],
) {
  const data = ref<T | null>(null) as Ref<T | null>
  const isLoading = ref(false)
  const isError = ref(false)
  const error = ref<unknown>(null)

  async function execute() {
    isLoading.value = true
    isError.value = false
    error.value = null
    try {
      data.value = await fn()
    } catch (e) {
      isError.value = true
      error.value = e
    } finally {
      isLoading.value = false
    }
  }

  if (deps) {
    watch(deps, execute, { immediate: true })
  } else {
    execute()
  }

  return { data, isLoading, isError, error, execute }
}
