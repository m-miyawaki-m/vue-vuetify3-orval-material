// ============================================================
// テスト対象: StockSearchPage (src/pages/StockSearchPage.vue)
// 種別: ページコンポーネントテスト（雛形: composable を持つページはこの形で書く）
// ------------------------------------------------------------
// 考え方:
//   通信の中身は composable テスト（useStockSearch.test.ts）で保証済みなので、
//   ここでは composable を丸ごと vi.mock し「画面の責務」だけを検証する。
//   1. 入力 → 引数の組み立て（フォーム操作の結果、composable に渡る条件オブジェクト）
//   2. 状態 → 表示の分岐（loading / 0件 / 結果あり / エラー / 検索前）
//   3. 操作 → 遷移（カードタップで詳細へ）
// 依存モック
//   - useStockSearch: 戻り値の ref をテスト側から直接操作して各状態を作る
//   - vue-router: useRouter().push をスパイ（画面遷移の検証）
// ------------------------------------------------------------
// テストケース一覧
//   [1] 検索前は結果領域（件数・カード・メッセージ）が表示されない
//   [2] キーワードをスペース区切りで入力して検索 → OR 配列に分割された条件が渡る
//   [3] ローディング中はプログレスバーが表示される
//   [4] 0件のとき 0件メッセージが表示される
//   [5] 結果ありのとき件数とカードが表示され、カードタップで /detail/:id に遷移
//   [6] エラーのときエラーメッセージが表示される
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ApiError } from '@/api/apiError'
import type { Product, ProductListResponse, StockSearchCondition } from '@/types/api'
import { useStockSearch } from '@/composables/queries/useStockSearch'
import StockSearchPage from '../StockSearchPage.vue'

// ── composable を丸ごとモック ──────────────────────────────────
// 戻り値の ref をテストから直接操作して「loading 中」「0件」などの状態を作る。
// 通信を偽装する必要はない（それは composable テストの責務）。
vi.mock('@/composables/queries/useStockSearch')
const mockedUseStockSearch = vi.mocked(useStockSearch)

const searchResult = ref<ProductListResponse | null>(null)
const isLoading = ref(false)
const error = ref<ApiError | null>(null)
// ページが composable に渡した条件 ref を捕まえる（引数組み立ての検証用）
let receivedCondition: Ref<StockSearchCondition | null>

// ── vue-router: push をスパイ ──────────────────────────────────
const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({ push: mockPush, back: vi.fn() }),
    useRoute: () => ({ path: '/stock-search', query: {} }),
  }
})

// MainLayout の v-bottom-navigation がナビゲーションタブを描画するため最小限のルーターは必要
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/stock-search', component: { template: '<div />' } },
      { path: '/detail/:id', component: { template: '<div />' } },
    ],
  })
}

const product: Product = {
  id: 1,
  name: 'オーガニック緑茶',
  category: '食品',
  price: 1200,
  inStock: true,
  description: 'テスト用',
  rating: 4,
  reviews: [],
}

function makeResult(items: Product[]): ProductListResponse {
  return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 }
}

function mountPage() {
  return mount(StockSearchPage, {
    global: { plugins: [makeRouter()] },
    attachTo: document.body,
  })
}

/** 検索ボタンを押して condition を確定させる */
async function clickSearch(wrapper: VueWrapper) {
  const searchBtn = wrapper.findAll('button').find((b) => b.text().trim() === '検索')
  await searchBtn?.trigger('click')
  await flushPromises()
}

describe('StockSearchPage', () => {
  beforeEach(() => {
    mockPush.mockClear()
    searchResult.value = null
    isLoading.value = false
    error.value = null
    mockedUseStockSearch.mockImplementation((condition) => {
      receivedCondition = condition as Ref<StockSearchCondition | null>
      return {
        searchResult,
        isLoading,
        error,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStockSearch>
    })
  })

  it('検索前は結果領域が表示されない', () => {
    const wrapper = mountPage()
    expect(receivedCondition.value).toBeNull()
    expect(wrapper.text()).not.toMatch(/\d+件/)
    expect(wrapper.find('[data-testid="search-loading"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('キーワードをスペース区切りで入力して検索すると OR 配列に分割された条件が渡る', async () => {
    const wrapper = mountPage()
    await wrapper.find('input').setValue('緑茶 蜂蜜')
    await clickSearch(wrapper)

    expect(receivedCondition.value).toEqual({
      keywords: ['緑茶', '蜂蜜'],
      categories: [],
      inStockOnly: false,
    })
    wrapper.unmount()
  })

  it('ローディング中はプログレスバーが表示される', async () => {
    isLoading.value = true
    const wrapper = mountPage()
    await clickSearch(wrapper)

    expect(wrapper.find('[data-testid="search-loading"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('0件のとき 0件メッセージが表示される', async () => {
    searchResult.value = makeResult([])
    const wrapper = mountPage()
    await clickSearch(wrapper)

    expect(wrapper.text()).toContain('0件')
    expect(wrapper.text()).toContain('条件に一致する商品が見つかりませんでした。')
    wrapper.unmount()
  })

  it('結果ありのとき件数とカードが表示され、カードタップで /detail/:id に遷移する', async () => {
    searchResult.value = makeResult([product])
    const wrapper = mountPage()
    await clickSearch(wrapper)

    expect(wrapper.text()).toContain('1件')
    expect(wrapper.text()).toContain('オーガニック緑茶')

    await wrapper.find('.v-card').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/detail/1')
    wrapper.unmount()
  })

  it('エラーのときエラーメッセージが表示される', async () => {
    error.value = new ApiError('通信に失敗しました')
    const wrapper = mountPage()
    await clickSearch(wrapper)

    expect(wrapper.text()).toContain('検索に失敗しました')
    wrapper.unmount()
  })
})
