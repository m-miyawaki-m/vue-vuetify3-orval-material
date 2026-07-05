// ============================================================
// テスト対象: useStockSearch (src/composables/queries/useStockSearch.ts)
// 種別: composable ユニットテスト
// ------------------------------------------------------------
// 「画面固有の検索オブジェクトを POST で送る検索」パターンのお手本テスト。
// パターン:
//   - customAxiosInstance を vi.mock して API 応答を制御する
//   - コンポーネントに mount して composable を実行する
//     （vue-query は setup() 内でしか使えないため。VueQueryPlugin は
//       src/test/setup.ts がテスト毎に登録済み）
// テストケース一覧
//   [1] 条件を渡すと POST /products/stock-search に条件オブジェクトが送られ結果が返る
//   [2] 条件が null の間は通信しない（検索ボタン押下前）
//   [3] API エラー時: error に ApiError が入り searchResult は null
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { customAxiosInstance } from '@/plugins/axios'
import { ApiError } from '@/api/apiError'
import type { ProductListResponse, StockSearchCondition } from '@/types/api'
import { useStockSearch } from '../useStockSearch'

vi.mock('@/plugins/axios', () => ({
  customAxiosInstance: vi.fn(),
}))
const mockedAxios = vi.mocked(customAxiosInstance)

/** composable を setup() 内で実行して戻り値を取り出すヘルパー */
function mountComposable<T>(composable: () => T): T {
  let result!: T
  mount(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    }),
  )
  return result
}

const condition: StockSearchCondition = {
  keywords: ['緑茶', '蜂蜜'],
  categories: ['食品'],
  inStockOnly: true,
}

const response: ProductListResponse = {
  items: [
    {
      id: 1,
      name: 'オーガニック緑茶',
      category: '食品',
      price: 1200,
      inStock: true,
      description: 'テスト用',
      rating: 4,
      reviews: [],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
}

describe('useStockSearch', () => {
  beforeEach(() => {
    mockedAxios.mockReset()
  })

  it('条件を渡すと POST /products/stock-search に条件オブジェクトが送られ結果が返る', async () => {
    mockedAxios.mockResolvedValue(response)
    const { searchResult, isLoading } = mountComposable(() => useStockSearch(ref(condition)))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/products/stock-search',
        method: 'POST',
        data: condition,
      }),
      undefined,
    )
    expect(searchResult.value).toEqual(response)
  })

  it('条件が null の間は通信しない', async () => {
    const { searchResult, isLoading } = mountComposable(() =>
      useStockSearch(ref<StockSearchCondition | null>(null)),
    )
    expect(isLoading.value).toBe(false)
    expect(mockedAxios).not.toHaveBeenCalled()
    expect(searchResult.value).toBeNull()
  })

  it('API エラー時は error に ApiError が入り searchResult は null', async () => {
    mockedAxios.mockRejectedValue(new ApiError('検索に失敗しました', 500))
    const { searchResult, error, isLoading } = mountComposable(() => useStockSearch(ref(condition)))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value?.message).toBe('検索に失敗しました')
    expect(searchResult.value).toBeNull()
  })
})
