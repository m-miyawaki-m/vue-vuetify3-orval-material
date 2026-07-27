import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

const mockProduct = ref<Record<string, unknown> | null>({
  id: 1,
  name: 'サンプル商品A',
  price: 1280,
  inStock: true,
  description: 'テスト用商品',
})
vi.mock('@/composables/queries/useProductDetail', () => ({
  useProductDetail: vi.fn(() => ({
    product: computed(() => mockProduct.value),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  })),
}))

import ListSplitResultPage from '../pages/ListSplitResultPage.vue'
import SingleLookupResultPage from '../pages/SingleLookupResultPage.vue'
import { useScanSessionStore } from '../stores/scanSessionStore'

const mountOpts = { global: { stubs: { teleport: true } } }

describe('ListSplitResultPage', () => {
  beforeEach(() => vi.clearAllMocks())

  function seedStore() {
    const store = useScanSessionStore()
    store.startSession('list-split', 'continuous')
    store.addItem({
      raw: 'ITEM01,LOT-A,12',
      format: 'QR_CODE',
      timestamp: 1000,
      fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
    })
    store.addItem({
      raw: 'ITEM02,LOT-B,5',
      format: 'QR_CODE',
      timestamp: 2000,
      fields: { productCode: 'ITEM02', lot: 'LOT-B', qty: '5' },
    })
    return store
  }

  it('蓄積 items がカードで表示される', () => {
    seedStore()
    const w = mount(ListSplitResultPage, mountOpts)
    expect(w.text()).toContain('読取済み: 2件')
    expect(w.text()).toContain('商品コード: ITEM01')
    expect(w.text()).toContain('商品コード: ITEM02')
  })

  it('確定でセッションが reset され索引へ遷移する', async () => {
    const store = seedStore()
    const w = mount(ListSplitResultPage, mountOpts)
    const confirmBtn = w.findAll('button').find((b) => b.text().includes('確定'))!
    await confirmBtn.trigger('click')
    expect(store.hasSession).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan')
  })

  it('セッションなしで直接アクセスするとスキャン画面へ replace される', () => {
    mount(ListSplitResultPage, mountOpts)
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/list-split')
  })
})

describe('SingleLookupResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProduct.value = {
      id: 1,
      name: 'サンプル商品A',
      price: 1280,
      inStock: true,
      description: 'テスト用商品',
    }
  })

  function seedStore(raw: string) {
    const store = useScanSessionStore()
    store.startSession('single-lookup', 'single')
    store.setSingleResult({ raw, format: 'EAN_13', timestamp: 1000, fields: {} })
  }

  it('照会結果の商品名と価格が表示される', () => {
    seedStore('1')
    const w = mount(SingleLookupResultPage, mountOpts)
    expect(w.text()).toContain('サンプル商品A')
    expect(w.text()).toContain('1,280')
  })

  it('該当なしのときメッセージを表示する', () => {
    mockProduct.value = null
    seedStore('999')
    const w = mount(SingleLookupResultPage, mountOpts)
    expect(w.text()).toContain('該当する商品が見つかりません')
  })

  it('数値でない読取値はエラーメッセージを表示する', () => {
    seedStore('ABC')
    const w = mount(SingleLookupResultPage, mountOpts)
    expect(w.text()).toContain('商品コードが数値ではありません')
  })
})
