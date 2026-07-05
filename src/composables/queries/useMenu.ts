import { computed } from 'vue'
import { useGetMenu } from '@/api'
import { GetMenuResponse } from '@/api/index.zod'
import type { MenuItem } from '@/types/api'
import fallbackData from '@/data/main-menu.json'

// ローカル JSON は信頼境界のため zod で実行時検証する
const fallback: MenuItem[] = GetMenuResponse.parse(fallbackData)

/**
 * メインメニュー取得。
 * API エラー時はローカル JSON にフォールバック（オフラインモード）。
 */
export function useMenu() {
  const query = useGetMenu()

  const isFallback = computed(() => query.isError.value)
  const menuItems = computed<MenuItem[]>(() =>
    isFallback.value ? fallback : (query.data.value ?? []),
  )

  return {
    menuItems,
    isFallback,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
