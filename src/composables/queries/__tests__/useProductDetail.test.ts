// ============================================================
// テスト対象: useProductDetail (src/composables/queries/useProductDetail.ts)
// 種別: composable ユニットテスト（雛形: 他の取得系 composable もこの形で書く）
// ------------------------------------------------------------
// パターン:
//   - customAxiosInstance を vi.mock して API 応答を制御する
//   - コンポーネントに mount して composable を実行する
//     （vue-query は setup() 内でしか使えないため。VueQueryPlugin は
//       src/test/setup.ts がテスト毎に登録済み）
// テストケース一覧
//   [1] API 成功時: レスポンスの商品を返す
//   [2] API エラー時: モック JSON の同 id 商品にフォールバック
//   [3] API エラーかつモックにも無い id: null
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { customAxiosInstance } from '@/plugins/axios'
import { ApiError } from '@/api/apiError'
import type { Product } from '@/types/api'
import { useProductDetail } from '../useProductDetail'

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

const apiProduct: Product = {
  id: 1,
  name: 'API から取得した商品',
  category: '食品',
  price: 500,
  inStock: true,
  description: 'テスト用',
  rating: 4,
  reviews: [],
}

describe('useProductDetail', () => {
  beforeEach(() => {
    mockedAxios.mockReset()
  })

  it('API 成功時はレスポンスの商品を返す', async () => {
    mockedAxios.mockResolvedValue(apiProduct)
    const { product, isLoading } = mountComposable(() => useProductDetail(1))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(product.value?.name).toBe('API から取得した商品')
  })

  it('API エラー時はモック JSON の同 id 商品にフォールバック', async () => {
    mockedAxios.mockRejectedValue(new ApiError('接続できません', undefined))
    const { product, isLoading } = mountComposable(() => useProductDetail(1))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    // src/mocks/products-data.json の id=1
    expect(product.value?.name).toBe('オーガニック緑茶')
  })

  it('API エラーかつモックにも無い id は null', async () => {
    mockedAxios.mockRejectedValue(new ApiError('接続できません', undefined))
    const { product, isLoading } = mountComposable(() => useProductDetail(99999))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(product.value).toBeNull()
  })
})
