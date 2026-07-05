// ============================================================
// テスト対象: useRegisterProduct (src/composables/mutations/useRegisterProduct.ts)
// 種別: composable ユニットテスト（雛形: 他の更新系 composable もこの形で書く）
// ------------------------------------------------------------
// テストケース一覧
//   [1] submit が POST /products を呼ぶ
//   [2] 成功時: onSuccess コールバックが呼ばれ、成功 snackbar が出る
//   [3] 成功時: isSubmitting が false に戻る
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { customAxiosInstance } from '@/plugins/axios'
import { useSnackbar } from '@/composables/useSnackbar'
import type { Product, ProductInput } from '@/types/api'
import { useRegisterProduct } from '../useRegisterProduct'

vi.mock('@/plugins/axios', () => ({
  customAxiosInstance: vi.fn(),
}))
const mockedAxios = vi.mocked(customAxiosInstance)

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

const payload: ProductInput = {
  name: '新商品',
  category: '食品',
  price: 980,
  inStock: true,
  description: 'テスト登録',
}

const created: Product = { ...payload, id: 100, rating: 0, reviews: [] }

describe('useRegisterProduct', () => {
  const { state } = useSnackbar()

  beforeEach(() => {
    mockedAxios.mockReset()
    state.show = false
    state.text = ''
  })

  it('submit が POST /products を呼ぶ', async () => {
    mockedAxios.mockResolvedValue(created)
    const { submit, isSubmitting } = mountComposable(() => useRegisterProduct())
    submit(payload)
    await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/products', method: 'POST', data: payload }),
      undefined,
    )
  })

  it('成功時: onSuccess が呼ばれ成功 snackbar が出る', async () => {
    mockedAxios.mockResolvedValue(created)
    const onSuccess = vi.fn()
    const { submit, isSubmitting } = mountComposable(() => useRegisterProduct())
    submit(payload, { onSuccess })
    await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
    expect(onSuccess).toHaveBeenCalledWith(created)
    expect(state.show).toBe(true)
    expect(state.color).toBe('success')
    expect(state.text).toBe('登録しました')
  })

  it('成功後は isSubmitting が false に戻る', async () => {
    mockedAxios.mockResolvedValue(created)
    const { submit, isSubmitting } = mountComposable(() => useRegisterProduct())
    submit(payload)
    await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
  })
})
