# チーム製造向け共通層 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ページ製造者が「`useXxx()` を呼んで data/error を使うだけ」になる共通層（composables/queries・composables/mutations・共通エラー処理・store 規約・ESLint 制限・チームガイド）を構築する。

**Architecture:** orval 生成フックを `src/composables/` の薄いドメイン composable でラップし、ページからの直接 API アクセスを ESLint で遮断する。型は orval の `output.schemas` で `src/types/api/` に生成先を分離し、既存の `src/types/` 慣習に統一。エラーは axios 正規化 → グローバル snackbar（QueryCache / MutationCache）→ ページはオプトインの3段構え。

**Tech Stack:** Vue 3 + Vuetify 3, orval v8 (vue-query client), @tanstack/vue-query v5, Pinia + pinia-plugin-persistedstate, zod, Vitest, ESLint flat config

**Spec:** `docs/superpowers/specs/2026-07-06-team-common-layer-design.md`

## Global Constraints

- コードスタイル: セミコロンなし・シングルクォート（Prettier 準拠）。コメント・UI 文言は日本語
- `src/api/**` と `src/types/api/**` は orval 自動生成。**手編集禁止**（変更は openapi/api.yaml → `npm run orval`）
- 各タスク完了時に `npm run type-check` と `npm run test:run` が通ること
- コミットメッセージは既存リポジトリの慣習（`feat:` / `refactor:` / `docs:` + 日本語）に従い、末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける
- コマンドはすべてリポジトリルート（`C:\dev\vue-vuetify3-orval-material`）で実行

---

### Task 1: orval 型生成先の分離（src/types/api）＋ POST /products 追加

**Files:**
- Modify: `openapi/api.yaml`
- Modify: `orval.config.ts`
- Regenerate: `src/api/index.ts`, `src/api/index.zod.ts`, `src/types/api/**`（自動生成）
- Modify: `src/utils/searchUtils.ts:1`
- Modify: `src/utils/__tests__/searchUtils.test.ts:11`
- Modify: `src/components/product/ProductCard.vue:41`
- Modify: `src/components/product/ProductDialog.vue:23`
- Modify: `src/components/product/__tests__/ProductCard.test.ts:25`
- Delete: `src/types/product.ts`

**Interfaces:**
- Consumes: なし（最初のタスク）
- Produces:
  - `@/types/api` から全 API 型が import 可能になる: `Product`, `ProductCategory`, `ProductListResponse`, `GetProductsParams`, `MenuItem`, `MenuChild`, `Review`, `ErrorResponse`, **`ProductInput`（新規）**
  - `@/api` に `usePostProduct`（useMutation フック。変数は `{ data: ProductInput }`、成功時レスポンスは `Product`）が生成される
  - 既存フック `useGetMenu` / `useGetProducts` / `useGetProductById` と `getGetProductsQueryKey()` は変更なし

- [ ] **Step 1: openapi/api.yaml に POST /products と ProductInput を追加**

`/products` パスの `get:` の後（`/products/{id}` の前）に `post:` を追加:

```yaml
    post:
      operationId: postProduct
      summary: 商品登録
      tags: [products]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductInput'
      responses:
        '201':
          description: 登録した商品
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '400':
          description: 入力エラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
```

`components.schemas` の `Product` の前に `ProductInput` を追加:

```yaml
    ProductInput:
      type: object
      required: [name, category, price, inStock, description]
      properties:
        name:
          type: string
        category:
          $ref: '#/components/schemas/ProductCategory'
        price:
          type: integer
          description: 価格（円）
        inStock:
          type: boolean
        description:
          type: string
```

- [ ] **Step 2: orval.config.ts に schemas オプションを追加**

`api` プロジェクトの `output` に `schemas` を1行追加（`apiZod` は変更しない）:

```typescript
  api: {
    input: './openapi/api.yaml',
    output: {
      target: './src/api/index.ts',
      // 型定義は src/types/api/ に分離生成（ページは @/types/api から型を import する）
      schemas: './src/types/api',
      client: 'vue-query',
      // httpClient を省略すると fetch 用のラップ型 ({data,status,headers}) が生成され mutator と非互換になるため必須
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
```

- [ ] **Step 3: 再生成して生成物を確認**

Run: `npm run orval`
Expected: エラーなく完了。`src/types/api/` に `product.ts`, `productInput.ts`, `menuItem.ts` 等＋バレル `index.ts` が生成され、`src/api/index.ts` に `usePostProduct` が含まれる

Run: `grep -l "usePostProduct" src/api/index.ts && ls src/types/api`
Expected: `src/api/index.ts` がヒットし、型ファイル一覧が表示される

- [ ] **Step 4: 型 import を @/types/api に切り替え**

型が `src/api/index.ts` から `src/types/api/` へ移ったため、型 import を全て張り替える:

`src/utils/searchUtils.ts:1`:
```typescript
import type { Product, ProductListResponse } from '@/types/api'
```

`src/utils/__tests__/searchUtils.test.ts:11`:
```typescript
import type { Product } from '@/types/api'
```

`src/components/product/ProductCard.vue:41`・`src/components/product/ProductDialog.vue:23`・`src/components/product/__tests__/ProductCard.test.ts:25`（手書き重複型 `@/types/product` から切り替え）:
```typescript
import type { Product } from '@/types/api'
```

※ `src/pages/*.vue` の型 import（`@/api/index` 参照）は Task 3〜5 のページ移行で同時に張り替えるため、ここでは触らない。ただし型の移動で一時的に type-check が失敗する場合は、該当行だけ `@/types/api` に先行変更してよい（例: `MainMenuPage.vue:47`, `ProductListPage.vue:82`, `DetailPage.vue:231`）

- [ ] **Step 5: 手書き重複型を削除**

Run: `git rm src/types/product.ts`

- [ ] **Step 6: 検証**

Run: `npm run type-check`
Expected: エラーなし

Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: orval 型生成先を src/types/api に分離し POST /products を追加"
```

---

### Task 2: MutationCache のグローバルエラー通知（TDD）

**Files:**
- Modify: `src/plugins/vueQuery.ts`
- Test: `src/plugins/__tests__/vueQuery.test.ts`

**Interfaces:**
- Consumes: `ApiError`（`@/api/apiError`）、`useSnackbar`（`@/composables/useSnackbar`）
- Produces: `createAppQueryClient()` が MutationCache 付きの QueryClient を返す。更新系エラーは自動で snackbar 表示（ApiError → サーバー message / その他 → 「処理に失敗しました」）

- [ ] **Step 1: 失敗するテストを追加**

`src/plugins/__tests__/vueQuery.test.ts` の import に `Mutation` 型を追加し、テストを2件追加:

```typescript
import type { Mutation, Query } from '@tanstack/vue-query'
```

ヘッダーコメントのテストケース一覧に `[4] [5]` を追記し、`describe` 内末尾に追加:

```typescript
  it('MutationCache の onError が ApiError の message を snackbar に流す', () => {
    const client = createAppQueryClient()
    const onError = client.getMutationCache().config.onError
    onError?.(
      new ApiError('在庫が不足しています', 409),
      undefined,
      undefined,
      {} as Mutation<unknown, Error, unknown, unknown>,
    )
    expect(state.show).toBe(true)
    expect(state.color).toBe('error')
    expect(state.text).toBe('在庫が不足しています')
  })

  it('MutationCache: ApiError 以外は汎用メッセージ', () => {
    const client = createAppQueryClient()
    client
      .getMutationCache()
      .config.onError?.(new Error('raw'), undefined, undefined, {} as Mutation<unknown, Error, unknown, unknown>)
    expect(state.text).toBe('処理に失敗しました')
  })
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/plugins/__tests__/vueQuery.test.ts`
Expected: 新規2件が FAIL（`config.onError` が undefined のため snackbar が更新されない）

- [ ] **Step 3: MutationCache を実装**

`src/plugins/vueQuery.ts` を以下に変更（import 行と `queryCache` の後に `mutationCache` 追加）:

```typescript
import { MutationCache, QueryCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
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
    mutationCache: new MutationCache({
      onError: (error) => {
        const message =
          error instanceof ApiError ? error.message : '処理に失敗しました'
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
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/plugins/__tests__/vueQuery.test.ts`
Expected: 全5件 PASS

- [ ] **Step 5: Commit**

```bash
git add src/plugins/vueQuery.ts src/plugins/__tests__/vueQuery.test.ts
git commit -m "feat: MutationCache のグローバルエラー通知を追加"
```

---

### Task 3: useMenu composable ＋ MainMenuPage 移行

**Files:**
- Create: `src/composables/queries/useMenu.ts`
- Modify: `src/pages/MainMenuPage.vue`

**Interfaces:**
- Consumes: `useGetMenu`（`@/api`）、`GetMenuResponse`（`@/api/index.zod`）、`MenuItem` 型（`@/types/api`）
- Produces: `useMenu(): { menuItems: ComputedRef<MenuItem[]>, isFallback: ComputedRef<boolean>, isLoading: Ref<boolean>, error: Ref<unknown>, refetch: Function }`

- [ ] **Step 1: useMenu を作成**

`src/composables/queries/useMenu.ts`:

```typescript
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
```

- [ ] **Step 2: MainMenuPage を移行**

`src/pages/MainMenuPage.vue` の `<script setup>` を以下に変更（template は `isError` → `isFallback`、`items` → `menuItems` の2箇所置換。style は変更なし）:

```typescript
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useMenu } from '@/composables/queries/useMenu'
import type { MenuItem } from '@/types/api'

const router = useRouter()
const sheet = ref(false)
const activeItem = ref<MenuItem | null>(null)

const { menuItems, isFallback, isLoading } = useMenu()

function openSubMenu(item: MenuItem) {
  activeItem.value = item
  sheet.value = true
}

function navigate(to: string) {
  sheet.value = false
  router.push(to)
}
```

template 側の変更（2箇所）:

```html
      <div v-if="isFallback" class="mb-4">
```

```html
        <div v-for="item in menuItems" :key="item.id" class="menu-item" @click="openSubMenu(item)">
```

- [ ] **Step 3: 検証**

Run: `npm run type-check`
Expected: エラーなし

Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 4: Commit**

```bash
git add src/composables/queries/useMenu.ts src/pages/MainMenuPage.vue
git commit -m "refactor: メニュー取得を useMenu composable に移設"
```

---

### Task 4: useProductList composable ＋ ProductListPage 移行

**Files:**
- Create: `src/composables/queries/useProductList.ts`
- Modify: `src/pages/ProductListPage.vue`

**Interfaces:**
- Consumes: `useGetProducts`（`@/api`）、`GetProductByIdResponse`（`@/api/index.zod`）、`GetProductsParams` / `Product` / `ProductListResponse` 型（`@/types/api`）、`filterProducts`（`@/utils/searchUtils`）
- Produces: `useProductList(params: MaybeRef<GetProductsParams>): { productList: ComputedRef<ProductListResponse>, isFallback: ComputedRef<boolean>, isLoading: Ref<boolean>, error: Ref<unknown>, refetch: Function }`

- [ ] **Step 1: useProductList を作成**

`src/composables/queries/useProductList.ts`:

```typescript
import { computed, unref, type MaybeRef } from 'vue'
import { z } from 'zod'
import { keepPreviousData } from '@tanstack/vue-query'
import { useGetProducts } from '@/api'
import { GetProductByIdResponse } from '@/api/index.zod'
import type { GetProductsParams, Product, ProductListResponse } from '@/types/api'
import mockProductsData from '@/mocks/products-data.json'
import { filterProducts } from '@/utils/searchUtils'

// モック JSON は信頼境界のため zod で実行時検証する
const mockProducts: Product[] = z.array(GetProductByIdResponse).parse(mockProductsData)

/**
 * 商品一覧取得。params の変化で自動再フェッチ・同一条件はキャッシュから即表示。
 * ページ遷移中は前ページのデータを保持（表示の点滅を防ぐ）。
 * API エラー時はモック JSON をクライアント側でフィルタして表示（オフラインモード）。
 */
export function useProductList(params: MaybeRef<GetProductsParams>) {
  const query = useGetProducts(params, {
    query: { placeholderData: keepPreviousData },
  })

  const isFallback = computed(() => query.isError.value)

  const mockFallback = computed<ProductListResponse>(() => {
    const p = unref(params)
    return filterProducts(
      mockProducts,
      { q: p.q, category: p.category, inStock: p.inStock },
      p.page ?? 1,
      p.pageSize ?? 5,
    )
  })

  const productList = computed<ProductListResponse>(() =>
    isFallback.value ? mockFallback.value : (query.data.value ?? mockFallback.value),
  )

  return {
    productList,
    isFallback,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

- [ ] **Step 2: ProductListPage を移行**

`src/pages/ProductListPage.vue` の `<script setup>` を以下に変更（template は `displayData` → `productList` の4箇所置換。style は変更なし）:

```typescript
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProductList } from '@/composables/queries/useProductList'
import type { GetProductsParams, Product } from '@/types/api'
import FlowStepper from '@/components/ui/FlowStepper.vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import SearchConditionChips from '@/components/search/SearchConditionChips.vue'

const PAGE_SIZE = 5
const router = useRouter()
const route = useRoute()

const currentPage = ref(1)

const queryQ = computed(() => route.query.q as string | undefined)
const queryCategory = computed(() => route.query.category as Product['category'] | undefined)
const queryInStock = computed(() => route.query.inStock === 'true')

const params = computed<GetProductsParams>(() => ({
  q: queryQ.value,
  category: queryCategory.value,
  inStock: queryInStock.value || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

const { productList, isFallback, isLoading } = useProductList(params)

function onPageChange(page: number) {
  currentPage.value = page
}

function goDetail(product: Product) {
  router.push(`/detail/${product.id}`)
}
```

template 側の変更（`displayData` を `productList` に置換、4箇所）:

```html
        <span v-if="!isLoading" class="text-body-2 text-medium-emphasis">{{ productList.total }}件</span>
```

```html
          <template v-if="productList.items.length > 0">
            <ProductCard
              v-for="product in productList.items"
```

```html
        :length="productList.totalPages"
```

- [ ] **Step 3: 検証**

Run: `npm run type-check`
Expected: エラーなし

Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 4: Commit**

```bash
git add src/composables/queries/useProductList.ts src/pages/ProductListPage.vue
git commit -m "refactor: 商品一覧取得を useProductList composable に移設"
```

---

### Task 5: useProductDetail composable（TDD・テスト雛形）＋ DetailPage 移行

**Files:**
- Create: `src/composables/queries/useProductDetail.ts`
- Test: `src/composables/queries/__tests__/useProductDetail.test.ts`
- Modify: `src/pages/DetailPage.vue`

**Interfaces:**
- Consumes: `useGetProductById`（`@/api`）、`GetProductByIdResponse`（`@/api/index.zod`）、`Product` 型（`@/types/api`）
- Produces: `useProductDetail(id: MaybeRef<number>): { product: ComputedRef<Product | null>, isLoading: Ref<boolean>, error: Ref<unknown>, refetch: Function }`
- テストファイルは「composable のテスト雛形」として team-guide から参照される

- [ ] **Step 1: 失敗するテストを書く**

`src/composables/queries/__tests__/useProductDetail.test.ts`:

```typescript
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/composables/queries/__tests__/useProductDetail.test.ts`
Expected: FAIL（`useProductDetail` モジュールが存在しない）

- [ ] **Step 3: useProductDetail を実装**

`src/composables/queries/useProductDetail.ts`:

```typescript
import { computed, unref, type MaybeRef } from 'vue'
import { z } from 'zod'
import { useGetProductById } from '@/api'
import { GetProductByIdResponse } from '@/api/index.zod'
import type { Product } from '@/types/api'
import mockProductsData from '@/mocks/products-data.json'

// モック JSON は信頼境界のため zod で実行時検証する
const mockProducts: Product[] = z.array(GetProductByIdResponse).parse(mockProductsData)

/**
 * 商品詳細取得。id の変化で自動再フェッチ・同一 id はキャッシュから即表示。
 * API エラー時はモック JSON の同 id 商品にフォールバック（オフラインモード）。
 */
export function useProductDetail(id: MaybeRef<number>) {
  const query = useGetProductById(id)

  const product = computed<Product | null>(() =>
    query.isError.value
      ? (mockProducts.find((p) => p.id === unref(id)) ?? null)
      : (query.data.value ?? null),
  )

  return {
    product,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/composables/queries/__tests__/useProductDetail.test.ts`
Expected: 3件 PASS

- [ ] **Step 5: DetailPage を移行**

`src/pages/DetailPage.vue` の `<script setup>` 冒頭の import と取得ロジックを変更。

削除する import（5行）:

```typescript
import { z } from 'zod'
import { useGetProductById } from '@/api/index'
import type { Product } from '@/api/index'
import { GetProductByIdResponse } from '@/api/index.zod'
import mockProductsData from '@/mocks/products-data.json'
```

追加する import（1行）:

```typescript
import { useProductDetail } from '@/composables/queries/useProductDetail'
```

削除するロジック（`mockProducts` 定義と取得部分）:

```typescript
const mockProducts: Product[] = z.array(GetProductByIdResponse).parse(mockProductsData)
```

```typescript
const { data, isError, isLoading } = useGetProductById(productId)

// API エラー時はモック JSON にフォールバック（オフラインモード）
const product = computed<Product | null>(() =>
  isError.value
    ? (mockProducts.find((p) => p.id === productId.value) ?? null)
    : (data.value ?? null),
)
```

置き換え後:

```typescript
const productId = computed(() => Number(props.id))
const { product, isLoading } = useProductDetail(productId)
```

`import { ref, computed, watch } from 'vue'` はそのまま（`computed` は `productId` で使用）。template・その他ロジックは変更なし。

- [ ] **Step 6: 検証**

Run: `npm run type-check`
Expected: エラーなし

Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 7: Commit**

```bash
git add src/composables/queries/useProductDetail.ts src/composables/queries/__tests__/useProductDetail.test.ts src/pages/DetailPage.vue
git commit -m "refactor: 商品詳細取得を useProductDetail composable に移設（テスト雛形付き）"
```

---

### Task 6: useRegisterProduct mutation composable（TDD）＋ DetailPage 登録配線

**Files:**
- Create: `src/composables/mutations/useRegisterProduct.ts`
- Test: `src/composables/mutations/__tests__/useRegisterProduct.test.ts`
- Modify: `src/pages/DetailPage.vue`

**Interfaces:**
- Consumes: `usePostProduct` / `getGetProductsQueryKey`（`@/api`、Task 1 で生成）、`Product` / `ProductInput` 型（`@/types/api`）、`useSnackbar`
- Produces: `useRegisterProduct(): { submit: (payload: ProductInput, callbacks?: { onSuccess?: (created: Product) => void }) => void, isSubmitting: Ref<boolean>, error: Ref<unknown> }`
- 更新系 composable のお手本として team-guide から参照される

- [ ] **Step 1: 失敗するテストを書く**

`src/composables/mutations/__tests__/useRegisterProduct.test.ts`:

```typescript
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
```

※ `expect.objectContaining` の第2引数 `undefined` は orval 生成コードが `customAxiosInstance(config, options)` を options なしで呼ぶため。実行して assertion が合わない場合は実際の呼び出し引数（`mockedAxios.mock.calls`）に合わせて修正してよい（生成コードの仕様確認が目的のテストではない）。

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/composables/mutations/__tests__/useRegisterProduct.test.ts`
Expected: FAIL（`useRegisterProduct` モジュールが存在しない）

- [ ] **Step 3: useRegisterProduct を実装**

`src/composables/mutations/useRegisterProduct.ts`:

```typescript
import { useQueryClient } from '@tanstack/vue-query'
import { usePostProduct, getGetProductsQueryKey } from '@/api'
import type { Product, ProductInput } from '@/types/api'
import { useSnackbar } from '@/composables/useSnackbar'

/**
 * 商品登録。
 * 成功時: 商品系キャッシュ（一覧・詳細）を無効化し、成功 snackbar を表示。
 * 失敗時: グローバル MutationCache がエラー snackbar を表示（ページ側の処理は不要）。
 */
export function useRegisterProduct() {
  const queryClient = useQueryClient()
  const { showSnack } = useSnackbar()

  const mutation = usePostProduct({
    mutation: {
      onSuccess: async () => {
        // ['products'] 前方一致で一覧・詳細キャッシュをまとめて無効化
        await queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() })
        showSnack('success', '登録しました')
      },
    },
  })

  function submit(
    payload: ProductInput,
    callbacks?: { onSuccess?: (created: Product) => void },
  ) {
    mutation.mutate(
      { data: payload },
      { onSuccess: (created) => callbacks?.onSuccess?.(created) },
    )
  }

  return {
    submit,
    isSubmitting: mutation.isPending,
    error: mutation.error, // ApiError | null（axios 層で正規化済み）
  }
}
```

※ orval 生成の `usePostProduct` のオプション形状が `{ mutation: {...} }` でない場合（型エラーが出る場合）は、生成された `src/api/index.ts` の `usePostProduct` シグネチャを確認して合わせること。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/composables/mutations/__tests__/useRegisterProduct.test.ts`
Expected: 3件 PASS

- [ ] **Step 5: DetailPage の登録処理を配線**

`src/pages/DetailPage.vue` を変更。

import の変更: `useSnackbar` の import を削除し、以下を追加:

```typescript
import { useRegisterProduct } from '@/composables/mutations/useRegisterProduct'
```

`const { showSnack } = useSnackbar()` の行を削除し、代わりに:

```typescript
const { submit, isSubmitting } = useRegisterProduct()
```

`onConfirm` を置き換え（成功 snackbar は composable が出すため手動 `showSnack` を削除）:

```typescript
function onConfirm() {
  confirmOpen.value = false
  if (!validate()) {
    errorSheetOpen.value = true
    tab.value = 'info'
    return
  }
  const p = product.value
  if (!p) return
  submit(
    {
      name: p.name,
      category: p.category,
      price: p.price,
      inStock: p.inStock,
      description: p.description,
    },
    { onSuccess: () => memoStore.setMemo(p.id, localMemo.value) },
  )
}
```

template の登録ボタンに `:loading` を追加:

```html
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-content-save"
          :disabled="!product"
          :loading="isSubmitting"
          @click="confirmOpen = true"
        >
          登録
        </v-btn>
```

※ 挙動変更（意図的）: 従来は登録ボタンでメモ保存のみだったが、POST /products を呼ぶお手本に変更。オフライン（API エラー）時は登録が失敗しエラー snackbar が出る（メモは保存されない）。

- [ ] **Step 6: 検証**

Run: `npm run type-check`
Expected: エラーなし

Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 7: Commit**

```bash
git add src/composables/mutations src/pages/DetailPage.vue
git commit -m "feat: 商品登録 mutation の共通 composable useRegisterProduct を追加し DetailPage に配線"
```

---

### Task 7: store 規約統一（persist 移行＋ xxxStore.ts リネーム）

**Files:**
- Rename: `src/stores/settings.ts` → `src/stores/settingsStore.ts`（persist 移行）
- Rename: `src/stores/theme.ts` → `src/stores/themeStore.ts`（persist 移行）
- Rename: `src/stores/memo.ts` → `src/stores/memoStore.ts`（内容変更なし）
- Rename: `src/stores/__tests__/memo.test.ts` → `src/stores/__tests__/memoStore.test.ts`
- Modify: `src/pages/DetailPage.vue:234,241`、`src/pages/SettingsPage.vue:36`、`src/App.vue:11`、`src/components/settings/SettingsThemePanel.vue:39`、`src/components/product/ProductCard.vue:42`、`src/components/product/__tests__/ProductCard.test.ts:23`

**Interfaces:**
- Consumes: なし
- Produces: `useSettingsStore` / `useThemeStore` / `useMemoStore` の import 元が `@/stores/settingsStore` / `@/stores/themeStore` / `@/stores/memoStore` に変わる。エクスポート名・戻り値は変更なし（`THEMES` / `AppTheme` / `ThemeMeta` も `themeStore.ts` からエクスポート継続）

- [ ] **Step 1: settings を persist 移行してリネーム**

Run: `git mv src/stores/settings.ts src/stores/settingsStore.ts`

`src/stores/settingsStore.ts` の内容を以下に置き換え:

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const errorHistoryLimit = ref<number>(100)

  return { errorHistoryLimit }
}, {
  persist: true,
})
```

※ 挙動変更（意図的）: localStorage キーが `app-settings` → `settings`（persistedstate の既定 = store id）に変わるため、既存の保存値は初回のみリセットされる。移行コードは書かない（サンプルアプリのため YAGNI）。theme も同様（`appTheme` → `theme`）。

- [ ] **Step 2: theme を persist 移行してリネーム**

Run: `git mv src/stores/theme.ts src/stores/themeStore.ts`

`src/stores/themeStore.ts` の `useThemeStore` 定義部分を以下に置き換え（`AppTheme` / `ThemeMeta` / `THEMES` の定義はそのまま残す。`STORAGE_KEY` 定数は削除）:

```typescript
export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<AppTheme>('dark')

  function setTheme(theme: AppTheme) {
    currentTheme.value = theme
  }

  return { currentTheme, setTheme }
}, {
  persist: true,
})
```

- [ ] **Step 3: memo をリネーム**

Run: `git mv src/stores/memo.ts src/stores/memoStore.ts && git mv src/stores/__tests__/memo.test.ts src/stores/__tests__/memoStore.test.ts`

`src/stores/__tests__/memoStore.test.ts` の import とヘッダーコメントを更新:

```typescript
import { useMemoStore } from '../memoStore'
```

ヘッダーコメント1行目: `// テスト対象: useMemoStore (src/stores/memoStore.ts)`

- [ ] **Step 4: 利用側の import を一括更新**

以下6ファイルの import パスを変更:

| ファイル | 変更前 | 変更後 |
|---|---|---|
| `src/pages/DetailPage.vue` | `'@/stores/memo'` / `'@/stores/settings'` | `'@/stores/memoStore'` / `'@/stores/settingsStore'` |
| `src/pages/SettingsPage.vue` | `'@/stores/settings'` | `'@/stores/settingsStore'` |
| `src/App.vue` | `'@/stores/theme'` | `'@/stores/themeStore'` |
| `src/components/settings/SettingsThemePanel.vue` | `'@/stores/theme'` | `'@/stores/themeStore'` |
| `src/components/product/ProductCard.vue` | `'@/stores/memo'` | `'@/stores/memoStore'` |
| `src/components/product/__tests__/ProductCard.test.ts` | `'@/stores/memo'` | `'@/stores/memoStore'` |

- [ ] **Step 5: 検証**

Run: `npm run type-check`
Expected: エラーなし

Run: `npm run test:run`
Expected: 全テスト PASS（memoStore.test.ts 7件含む）

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: store を xxxStore.ts 命名と persist: true に統一"
```

---

### Task 8: ESLint によるレイヤー規約の強制

**Files:**
- Modify: `eslint.config.js`

**Interfaces:**
- Consumes: Task 3〜7 完了が前提（既存違反が全て解消済みであること）
- Produces: `src/pages/**`・`src/components/**` の実装コードで `@/api` / `@tanstack/vue-query` / `axios` の import がエラーになる

- [ ] **Step 1: no-restricted-imports の override を追加**

`eslint.config.js` の「プロジェクト固有ルール」ブロックの後、`eslintConfigPrettier` の前に追加:

```javascript
  // ── レイヤー規約: pages/components は共通層（composables/stores/types）経由のみ ──
  // テストコードは対象外（vue-query のテストセットアップ等で低レイヤーに触るため）
  {
    files: ['src/pages/**/*.{ts,vue}', 'src/components/**/*.{ts,vue}'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/api', '@/api/*'],
              message: '@/api は直接使わず、@/composables の useXxx() と @/types/api の型を使ってください（docs/team-guide.md 参照）。',
            },
            {
              group: ['@tanstack/vue-query'],
              message: 'vue-query は composables 層専用です。@/composables の useXxx() を使ってください（docs/team-guide.md 参照）。',
            },
            {
              group: ['axios', '@/plugins/axios'],
              message: 'axios は直接使わず、@/composables の useXxx() を使ってください（docs/team-guide.md 参照）。',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 2: ルールが機能することを確認（一時的な違反で検証）**

`src/pages/HomePage.vue` の `<script setup>` に一時的に `import '@/api'` を追加して:

Run: `npx eslint src/pages/HomePage.vue`
Expected: `no-restricted-imports` エラーが出る（メッセージに team-guide.md 誘導文言）

確認後、追加した行を必ず削除する。

- [ ] **Step 3: 既存コードが全て通ることを確認**

Run: `npx eslint src`
Expected: エラー 0 件

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js
git commit -m "feat: pages/components からの @/api・vue-query・axios 直接 import を ESLint で禁止"
```

---

### Task 9: チームガイド＋アーキテクチャ資料の作成

**Files:**
- Create: `docs/team-guide.md`（使い方 — がっつり詳細）
- Create: `docs/common-layer-architecture.md`（考え方・アーキテクチャ）
- Modify: `docs/README.md`（存在する場合、両ドキュメントへのリンクを追加）

**Interfaces:**
- Consumes: Task 1〜8 の成果物（composable の実名・パス・テスト雛形・ESLint ルール）
- Produces: ページ製造メンバーが読む入口ドキュメント（team-guide）と、共通層の設計意図を説明する資料（architecture）

**要求（ユーザー指示）:** 使い方ドキュメントは詳細に。考え方とアーキテクチャも残すこと。

**team-guide.md の必須内容**（下記 Step 1 の雛形をベースに、各セクションを詳細化する）:
- 大原則2行と「なぜそうするか」への architecture 資料リンク
- 取得系: 基本パターン／ローディング・エラー・空状態の template 実例／`isFallback` 等の追加フィールドの扱い／`refetch` の使いどころ／params がリアクティブに再フェッチされる仕組みの説明
- 更新系: 基本パターン／`onSuccess` で画面遷移・後処理を書く理由／snackbar とキャッシュ無効化が自動である説明／`error` を個別表示したい場合の書き方
- 新 API 追加手順: openapi/api.yaml の書き方（既存 GET/POST の実例参照）→ `npm run orval` → composable 雛形コピー → テスト雛形コピー、の各ステップを画面例つきで
- store か ref か: 判断表＋判断フローの文章説明＋store 雛形＋persist の注意（手書き localStorage 禁止の理由）
- テストの書き方: composable テスト雛形の解説（なぜ customAxiosInstance を mock するのか）／ページテストで composable を vi.mock する例
- ESLint に怒られたら: 代表的なエラーメッセージと直し方の対応表
- よくある質問（最低5項目。例: 「同じ API を2ページで呼んだら2回通信される？」→ キャッシュの説明、「エラー時に snackbar を出したくない」、「一覧を手動で再読み込みしたい」、「POST 成功後に一覧が古いまま」、「型はどこから import する？」）

**common-layer-architecture.md の必須内容**:
- 全体レイヤー図（openapi.yaml → orval 生成物 → composables → pages、store と snackbar の位置づけ含む）
- データフロー: 取得系のシーケンス（ページ表示 → composable → orval フック → axios → キャッシュ → ref 更新）と更新系のシーケンス（submit → mutation → invalidate → 再取得）
- エラー処理3段構えの図と各層の責務（axios 正規化 / グローバル snackbar / ページのオプトイン）
- vue-query の考え方の入門解説（queryKey・キャッシュ・staleTime・invalidate を、vue-query を知らないメンバー向けに この構成の文脈で説明）
- サーバー状態とクライアント状態を分ける考え方（なぜ store にサーバーデータを入れないか）
- 設計判断の記録: なぜドメイン composable 手書きか（汎用ファクトリを作らない理由）／なぜ型を src/types/api に分離したか／なぜ ESLint で import 制限するか — スペックの検討過程から要約転記
- 関連資料リンク（スペック・既存の docs/vue-query-architecture.md 等）

- [ ] **Step 1: team-guide.md を作成（下記はベース構成。上記必須内容に沿って各セクションを詳細化すること）**

`docs/team-guide.md`:

````markdown
# チーム製造ガイド — ページの作り方

ページを製造する人が読む唯一の入口です。詳細な背景は
[共通層設計スペック](./superpowers/specs/2026-07-06-team-common-layer-design.md) を参照。

## 大原則（2行）

> **処理は `@/composables/**`・`@/stores/**` の `useXxx()`、型は `@/types/**` から。**
> **`@/api`・`@tanstack/vue-query`・`axios` を直接 import したら ESLint エラー。**

エラー処理はページに書かなくても共通処理が snackbar を出します。
try/catch は書きません。

## 1. ページでデータを表示したい（取得系）

```vue
<script setup lang="ts">
import { useProductDetail } from '@/composables/queries/useProductDetail'

const { product, isLoading, error } = useProductDetail(productId)
// product: データ（null 許容）。取得完了で勝手に入る
// isLoading: ローディング中フラグ
// error: こだわった個別エラー表示をしたい時だけ見る（見なくても snackbar は出る）
</script>

<template>
  <v-progress-linear v-if="isLoading" indeterminate />
  <div v-else-if="product">{{ product.name }}</div>
  <v-alert v-else type="error" variant="tonal">見つかりませんでした。</v-alert>
</template>
```

取得系 composable は必ず「データ・isLoading・error・refetch」を返します。
`isFallback`（オフラインモード表示用）などの追加フィールドを持つものもあります。

**お手本ページ**: `src/pages/ProductListPage.vue`（一覧＋検索＋ページネーション）、
`src/pages/DetailPage.vue`（詳細＋登録）、`src/pages/MainMenuPage.vue`（フォールバック表示）

## 2. ページから登録・更新したい（更新系）

```vue
<script setup lang="ts">
import { useRegisterProduct } from '@/composables/mutations/useRegisterProduct'

const { submit, isSubmitting } = useRegisterProduct()

function onSave() {
  // 成功 snackbar・失敗 snackbar・一覧キャッシュの更新は共通層がやる。
  // ページは「成功したら画面をどうするか」だけ書く
  submit(form.value, { onSuccess: () => router.back() })
}
</script>

<template>
  <v-btn :loading="isSubmitting" @click="onSave">登録</v-btn>
</template>
```

**お手本**: `src/composables/mutations/useRegisterProduct.ts` と `src/pages/DetailPage.vue` の `onConfirm`

## 3. 新しい API を使いたい（composable の追加手順）

1. `openapi/api.yaml` にエンドポイントを追加（既存定義をまねる）
2. `npm run orval` で `src/api/`（フック）と `src/types/api/`（型）を再生成
3. 下の雛形をコピーして `src/composables/queries/`（GET）または
   `src/composables/mutations/`（POST/PUT/DELETE）に1ファイル作る
4. テストを書く（雛形: `src/composables/queries/__tests__/useProductDetail.test.ts`）

### 取得系の雛形

```typescript
// src/composables/queries/useXxx.ts
import { computed, type MaybeRef } from 'vue'
import { useGetXxx } from '@/api' // TODO: orval が生成したフック名に変更
import type { Xxx } from '@/types/api' // TODO: 型名を変更

/** TODO: 何を取得するか1行で書く */
export function useXxx(id: MaybeRef<number>) {
  const query = useGetXxx(id)
  const xxx = computed(() => query.data.value ?? null) // TODO: データ名を変更
  return {
    xxx,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

### 更新系の雛形

```typescript
// src/composables/mutations/useXxxYyy.ts（例: useRegisterProduct = 動詞＋対象）
import { useQueryClient } from '@tanstack/vue-query'
import { usePostXxx, getGetXxxQueryKey } from '@/api' // TODO: フック名を変更
import type { Xxx, XxxInput } from '@/types/api' // TODO: 型名を変更
import { useSnackbar } from '@/composables/useSnackbar'

/** TODO: 何を登録/更新するか1行で書く */
export function useXxxYyy() {
  const queryClient = useQueryClient()
  const { showSnack } = useSnackbar()

  const mutation = usePostXxx({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetXxxQueryKey() })
        showSnack('success', '登録しました') // TODO: 文言を変更
      },
    },
  })

  function submit(
    payload: XxxInput,
    callbacks?: { onSuccess?: (result: Xxx) => void },
  ) {
    mutation.mutate({ data: payload }, {
      onSuccess: (result) => callbacks?.onSuccess?.(result),
    })
  }

  return { submit, isSubmitting: mutation.isPending, error: mutation.error }
}
```

## 4. 状態を持ちたい（store か ref か）

| データの種類 | 置き場所 |
|---|---|
| サーバーから取ってくるデータ | `composables/queries`（store に入れない） |
| 画面をまたいで持ちたいクライアント状態（設定・入力途中・端末状態） | Pinia store |
| 1画面で完結する状態 | ページ内 `ref` |

### store の雛形

```typescript
// src/stores/xxxStore.ts（ファイル名は xxxStore.ts、id は 'xxx'）
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useXxxStore = defineStore('xxx', () => {
  const value = ref('')

  function setValue(v: string) {
    value.value = v
  }

  return { value, setValue }
}, {
  persist: true, // アプリ再起動後も保持したい場合のみ。手書き localStorage は禁止
})
```

ページから見ると store も composable も「`useXxx()` を呼ぶと ref と関数が返る」で同じ形です。

## 5. テストの書き方

- **composable**: `src/composables/queries/__tests__/useProductDetail.test.ts` をコピーして
  ケースを書き換える（`customAxiosInstance` を `vi.mock` して API 応答を制御するパターン）
- **ページ**: composable を丸ごと `vi.mock` する。ページ側は「呼んだ結果をどう表示するか」
  だけをテストする

```typescript
// ページテストでの composable モック例
vi.mock('@/composables/queries/useProductDetail', () => ({
  useProductDetail: () => ({
    product: computed(() => ({ id: 1, name: 'テスト商品', /* ... */ })),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  }),
}))
```

## 6. エラー処理の考え方（読むだけでOK）

| 層 | 誰が書くか | 内容 |
|---|---|---|
| axios インターセプタ | 共通層（済） | 全エラーを ApiError（message / status）に正規化 |
| グローバル snackbar | 共通層（済） | 取得失敗・更新失敗を自動通知 |
| ページの `error` | あなた（任意） | フォールバック表示等、画面固有の対応をしたい時だけ |
````

- [ ] **Step 2: common-layer-architecture.md を作成**

上記「common-layer-architecture.md の必須内容」に沿って作成する。レイヤー図・シーケンスは Mermaid（```mermaid ブロック）または ASCII 図で表現。設計判断の記録はスペック `docs/superpowers/specs/2026-07-06-team-common-layer-design.md` の「検討過程」から要約し、スペックへのリンクを付ける。

- [ ] **Step 3: docs/README.md にリンク追加**

`docs/README.md` を確認し、ドキュメント一覧の先頭付近に追加:

```markdown
- [チーム製造ガイド（ページの作り方）](./team-guide.md) — **ページを製造する人はまずこれ**
- [共通層の考え方とアーキテクチャ](./common-layer-architecture.md) — 共通層の設計意図・データフロー・エラー処理の全体像
```

（README.md に一覧形式がない場合は、冒頭に上記2行を追加するだけでよい）

- [ ] **Step 4: 検証**

Run: `npx eslint src && npm run type-check && npm run test:run`
Expected: 全て成功（最終確認）

- [ ] **Step 5: Commit**

```bash
git add docs/team-guide.md docs/common-layer-architecture.md docs/README.md
git commit -m "docs: チーム製造ガイドと共通層アーキテクチャ資料を追加"
```

---

## 最終検証（全タスク完了後）

- [ ] `npm run type-check` / `npm run test:run` / `npx eslint src` が全て成功
- [ ] `npm run dev:mock` で起動し、メインメニュー表示 → 検索 → 一覧 → 詳細 → 登録（成功 snackbar）を目視確認。Prism を止めた状態でオフラインフォールバック（一覧・詳細・メニュー）とエラー snackbar も確認
