# データ取得アーキテクチャ（axios + orval + vue-query + zod）実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `openapi/api.yaml` から orval で vue-query composable と zod スキーマを自動生成し、共通処理（インターセプター・検証ヘルパー・QueryClient 設定・エラー通知）を整備して既存ページを移行する。

**Architecture:** orval の設定を `client: 'vue-query'` に変更し、同一 yaml から zod スキーマも第2エントリで生成する。サーバーデータは vue-query キャッシュ、UI 状態は Pinia、単独利用は composable 戻り値を直接表示。エラーは axios インターセプターで `ApiError` に正規化し、QueryCache の `onError` で既存 `useSnackbar` に通知する。

**Tech Stack:** Vue 3.5 / Vuetify 4 / Pinia 3 / orval 8.15 / @tanstack/vue-query 5（インストール済み・未使用）/ axios 1.17 / zod（新規追加）/ Vitest 4

**Spec:** `docs/superpowers/specs/2026-07-03-data-fetching-architecture-design.md`

## Global Constraints

- `openapi/api.yaml` が唯一の真実の源。`src/api/index.ts` と `src/api/index.zod.ts` は自動生成物であり**手編集禁止・テスト対象外**
- 生成コマンドは `npm run orval`
- 各タスク完了時に `npm run type-check` と `npm run test:run` が成功していること
- コミットメッセージは既存スタイル（`feat:` / `fix:` / `refactor:` / `test:` + 日本語）に従う
- テストファイル冒頭には既存スタイルのヘッダーコメント（テスト対象・依存モック・ケース一覧）を付ける
- パスエイリアス `@/` = `src/`

---

### Task 1: zod 追加・orval 設定変更・クライアント再生成・呼び出し側の最小修正

現状の生成コードは `getAppAPI()` ファクトリ形式（axios クライアント）。vue-query クライアントに切り替えると `getAppAPI` は消え、代わりに関数（`getMenu` / `getProducts` / `getProductById`）と composable（`useGetMenu` / `useGetProducts` / `useGetProductById`）と queryKey 関数が個別 export される。このタスクでは既存動作を壊さないよう、呼び出し側は**関数の直接 import に置き換えるだけ**にとどめる（composable への移行は Task 5〜7）。

**Files:**
- Modify: `orval.config.ts`
- Modify: `package.json`（zod 追加）
- Regenerate: `src/api/index.ts`
- Create (generated): `src/api/index.zod.ts`
- Modify: `src/stores/menu.ts:14-26`
- Modify: `src/pages/ProductListPage.vue:78-90`

**Interfaces:**
- Produces: `src/api/index.ts` から `useGetMenu()` / `useGetProducts(params)` / `useGetProductById(id)` / `getMenu()` / `getProducts(params)` / `getProductById(id)` / `getGetProductsQueryKey(params)` 等（orval 生成）
- Produces: `src/api/index.zod.ts` から `getMenuResponse` / `getProductsResponse` / `getProductsQueryParams` / `getProductByIdResponse` 等の zod スキーマ（orval 生成。**生成後に実際の export 名を確認すること**）

- [ ] **Step 1: zod をインストール**

```bash
npm install zod
```

- [ ] **Step 2: orval.config.ts を書き換え**

```typescript
import { defineConfig } from 'orval'

export default defineConfig({
  // ① vue-query composable + TS 型
  api: {
    input: './openapi/api.yaml',
    output: {
      target: './src/api/index.ts',
      client: 'vue-query',
      override: {
        mutator: {
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
      },
    },
  },
  // ② zod スキーマ
  apiZod: {
    input: './openapi/api.yaml',
    output: {
      target: './src/api/index.ts',
      client: 'zod',
      fileExtension: '.zod.ts',
    },
  },
})
```

- [ ] **Step 3: 再生成して生成物を確認**

```bash
npm run orval
```

確認事項:

```bash
grep -E "^export (const|function)" src/api/index.ts | head -30
grep -E "^export" src/api/index.zod.ts
```

期待: `src/api/index.ts` に `getMenu` / `getProducts` / `getProductById` / `useGetMenu` / `useGetProducts` / `useGetProductById` / `getGetMenuQueryKey` 等。`src/api/index.zod.ts` に `getMenuResponse` / `getProductsResponse` / `getProductByIdResponse` 等の zod スキーマ。

**export 名が想定と異なる場合は、以降のタスクで使う import 名を実際の生成名に読み替える**（プラン上の名前は上記想定で書かれている）。

**もし生成された `.zod.ts` がインストールした zod のバージョンでコンパイルエラーになる場合**（orval と zod v4 の互換性問題）: `npm install zod@3` にダウングレードして再確認する。

- [ ] **Step 4: `src/stores/menu.ts` の import を修正**

`getAppAPI` が消えたため、関数を直接 import する形に最小修正:

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMenu } from '@/api/index'
import type { MenuItem } from '@/api/index'
import fallbackData from '@/data/main-menu.json'

const fallback = fallbackData as MenuItem[]

export const useMainMenuStore = defineStore('mainMenu', () => {
  const items = ref<MenuItem[]>([])
  const isLoading = ref(true)
  const isError = ref(false)

  async function fetchMenu() {
    isLoading.value = true
    isError.value = false
    try {
      items.value = await getMenu()
    } catch {
      items.value = fallback
      isError.value = true
    } finally {
      isLoading.value = false
    }
  }

  fetchMenu()

  return { items, isLoading, isError, fetchMenu }
})
```

- [ ] **Step 5: `src/pages/ProductListPage.vue` の import を修正**

script setup 内の 2 箇所のみ変更:

```typescript
// 変更前
import { getAppAPI } from '@/api/index'
// …
const { getProducts } = getAppAPI()

// 変更後
import { getProducts } from '@/api/index'
// （const { getProducts } = getAppAPI() の行は削除）
```

- [ ] **Step 6: 型チェックとテストが通ることを確認**

```bash
npm run type-check
npm run test:run
```

期待: 両方成功（vue-query 生成 composable はまだ未使用なのでプラグイン未登録でも壊れない）。

- [ ] **Step 7: コミット**

```bash
git add orval.config.ts package.json package-lock.json src/api/ src/stores/menu.ts src/pages/ProductListPage.vue
git commit -m "feat: orval を vue-query クライアントに変更し zod スキーマ生成を追加"
```

---

### Task 2: zod 検証ヘルパー `validated()`

**Files:**
- Create: `src/api/validated.ts`
- Test: `src/api/__tests__/validated.test.ts`

**Interfaces:**
- Consumes: `src/api/index.zod.ts` の `getProductByIdResponse`（Task 1 生成物。統合テストで使用）
- Produces: `validated<T>(schema: ZodType<T>, promise: Promise<unknown>): Promise<T>` — parse 成功時は型付きデータ、失敗時は `ZodError` を throw

- [ ] **Step 1: 失敗するテストを書く**

`src/api/__tests__/validated.test.ts`:

```typescript
// ============================================================
// テスト対象: validated (src/api/validated.ts)
// 種別: ユニットテスト
// ------------------------------------------------------------
// テストケース一覧
//   [1] スキーマに一致するデータ → parse 済みデータを返す
//   [2] スキーマ違反データ → ZodError を throw
//   [3] orval 生成スキーマ（getProductByIdResponse）で正常 parse
// ============================================================
import { describe, it, expect } from 'vitest'
import { z, ZodError } from 'zod'
import { validated } from '../validated'
import { getProductByIdResponse } from '../index.zod'

describe('validated', () => {
  const schema = z.object({ id: z.number(), name: z.string() })

  it('スキーマに一致するデータを返す', async () => {
    const result = await validated(schema, Promise.resolve({ id: 1, name: '緑茶' }))
    expect(result).toEqual({ id: 1, name: '緑茶' })
  })

  it('スキーマ違反データは ZodError を throw する', async () => {
    await expect(
      validated(schema, Promise.resolve({ id: 'oops', name: 42 })),
    ).rejects.toBeInstanceOf(ZodError)
  })

  it('orval 生成スキーマで商品データを parse できる', async () => {
    const product = {
      id: 1,
      name: '緑茶',
      category: '食品',
      price: 500,
      inStock: true,
      description: '静岡県産の緑茶',
      rating: 4.5,
      reviews: [{ id: 1, author: '山田', rating: 5, comment: '美味しい' }],
    }
    const result = await validated(getProductByIdResponse, Promise.resolve(product))
    expect(result.name).toBe('緑茶')
  })
})
```

注: `getProductByIdResponse` の名前が Task 1 の生成結果と異なる場合は実際の export 名に合わせる。zod v3 を使うことになった場合、`ZodType` の import 元は同じ。

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/api/__tests__/validated.test.ts
```

期待: FAIL（`validated` が存在しない）

- [ ] **Step 3: 実装**

`src/api/validated.ts`:

```typescript
import type { ZodType } from 'zod'

/**
 * zod スキーマでレスポンスを実行時検証する共通ヘルパー。
 * 信頼境界（json/yaml データ読み取り・永続化復元）で使用する。
 * スキーマ違反 = openapi/api.yaml とデータの乖離（開発時バグ）。
 */
export const validated = async <T>(
  schema: ZodType<T>,
  promise: Promise<unknown>,
): Promise<T> => schema.parse(await promise)
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/api/__tests__/validated.test.ts
```

期待: PASS（3件）

- [ ] **Step 5: コミット**

```bash
git add src/api/validated.ts src/api/__tests__/validated.test.ts
git commit -m "feat: zod 検証ヘルパー validated() を追加"
```

---

### Task 3: ApiError 正規化 + axios レスポンスインターセプター

**Files:**
- Create: `src/api/apiError.ts`
- Modify: `src/plugins/axios.ts`
- Test: `src/api/__tests__/apiError.test.ts`

**Interfaces:**
- Produces: `class ApiError extends Error { status?: number }` / `toApiError(error: unknown): ApiError`
- 制約: `customAxiosInstance` のシグネチャ（orval mutator 契約）は**変更しない**

- [ ] **Step 1: 失敗するテストを書く**

`src/api/__tests__/apiError.test.ts`:

```typescript
// ============================================================
// テスト対象: ApiError / toApiError (src/api/apiError.ts)
// 種別: ユニットテスト
// ------------------------------------------------------------
// テストケース一覧
//   [1] レスポンスありの AxiosError → status と ErrorResponse.message を反映
//   [2] レスポンスなし（ネットワークエラー）→ status undefined・汎用メッセージ
//   [3] axios 以外のエラー → メッセージを引き継いだ ApiError に包む
//   [4] toApiError の結果は ApiError インスタンス
// ============================================================
import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { ApiError, toApiError } from '../apiError'

function makeAxiosError(status?: number, data?: unknown): AxiosError {
  const error = new AxiosError('Request failed')
  if (status !== undefined) {
    error.response = {
      status,
      data,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
  }
  return error
}

describe('toApiError', () => {
  it('レスポンスありの AxiosError から status と message を取り出す', () => {
    const result = toApiError(makeAxiosError(404, { message: '商品が見つかりません' }))
    expect(result).toBeInstanceOf(ApiError)
    expect(result.status).toBe(404)
    expect(result.message).toBe('商品が見つかりません')
  })

  it('ネットワークエラーは status undefined・汎用メッセージ', () => {
    const result = toApiError(makeAxiosError())
    expect(result.status).toBeUndefined()
    expect(result.message).toBe('通信に失敗しました')
  })

  it('axios 以外のエラーもメッセージを引き継いで包む', () => {
    const result = toApiError(new Error('boom'))
    expect(result).toBeInstanceOf(ApiError)
    expect(result.message).toBe('boom')
  })

  it('文字列など Error 以外は汎用メッセージ', () => {
    const result = toApiError('oops')
    expect(result.message).toBe('予期しないエラーが発生しました')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/api/__tests__/apiError.test.ts
```

期待: FAIL（`apiError.ts` が存在しない）

- [ ] **Step 3: 実装**

`src/api/apiError.ts`:

```typescript
import { isAxiosError } from 'axios'

/** HTTP エラーを正規化した型。呼び出し側は axios の内部構造を知らなくてよい。 */
export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number, cause?: unknown) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
  }
}

/** ErrorResponse（openapi/api.yaml 定義）の message を取り出す */
function extractMessage(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return undefined
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (error.response) {
      const message = extractMessage(error.response.data) ?? '通信に失敗しました'
      return new ApiError(message, error.response.status, error)
    }
    return new ApiError('通信に失敗しました', undefined, error)
  }
  if (error instanceof Error) return new ApiError(error.message, undefined, error)
  return new ApiError('予期しないエラーが発生しました', undefined, error)
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/api/__tests__/apiError.test.ts
```

期待: PASS（4件）

- [ ] **Step 5: インターセプターを登録**

`src/plugins/axios.ts` を以下に変更（`customAxiosInstance` のシグネチャは維持）:

```typescript
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { toApiError } from '@/api/apiError'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// 将来の認証トークン差し込み口（現状はそのまま通す）
axiosInstance.interceptors.request.use((config) => config)

// エラーを ApiError に正規化して reject
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
)

// Orval axios クライアントが呼ぶシグネチャ:
//   customAxiosInstance<T>(config, options?) → Promise<T>
// レスポンスボディ (response.data) だけを返す
export const customAxiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return axiosInstance({ ...config, ...options }).then((res) => res.data)
}
```

- [ ] **Step 6: 全体確認とコミット**

```bash
npm run type-check
npm run test:run
git add src/api/apiError.ts src/api/__tests__/apiError.test.ts src/plugins/axios.ts
git commit -m "feat: ApiError 正規化と axios インターセプターを追加"
```

---

### Task 4: QueryClient プラグイン・グローバルエラー通知・テストセットアップ

**Files:**
- Create: `src/plugins/vueQuery.ts`
- Modify: `src/plugins/index.ts`
- Modify: `src/test/setup.ts`
- Test: `src/plugins/__tests__/vueQuery.test.ts`

**Interfaces:**
- Consumes: `ApiError`（Task 3）、`useSnackbar`（既存。モジュールレベル reactive state のためコンポーネント外から呼び出し可）
- Produces: `createAppQueryClient(): QueryClient` / `registerVueQuery(app: App): void`

- [ ] **Step 1: 失敗するテストを書く**

`src/plugins/__tests__/vueQuery.test.ts`:

```typescript
// ============================================================
// テスト対象: createAppQueryClient (src/plugins/vueQuery.ts)
// 種別: ユニットテスト
// ------------------------------------------------------------
// テストケース一覧
//   [1] QueryCache の onError が ApiError の message を snackbar に流す
//   [2] ApiError 以外のエラーは汎用メッセージ
//   [3] デフォルトオプション（retry / refetchOnWindowFocus）が設定されている
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import type { Query } from '@tanstack/vue-query'
import { createAppQueryClient } from '../vueQuery'
import { ApiError } from '@/api/apiError'
import { useSnackbar } from '@/composables/useSnackbar'

describe('createAppQueryClient', () => {
  const { state } = useSnackbar()

  beforeEach(() => {
    state.show = false
    state.text = ''
  })

  it('onError が ApiError の message を snackbar に流す', () => {
    const client = createAppQueryClient()
    const onError = client.getQueryCache().config.onError
    onError?.(new ApiError('商品が見つかりません', 404), {} as Query<unknown, Error>)
    expect(state.show).toBe(true)
    expect(state.color).toBe('error')
    expect(state.text).toBe('商品が見つかりません')
  })

  it('ApiError 以外は汎用メッセージ', () => {
    const client = createAppQueryClient()
    client.getQueryCache().config.onError?.(new Error('raw'), {} as Query<unknown, Error>)
    expect(state.text).toBe('データの取得に失敗しました')
  })

  it('クエリのデフォルトオプションが設定されている', () => {
    const client = createAppQueryClient()
    const defaults = client.getDefaultOptions().queries
    expect(defaults?.retry).toBe(1)
    expect(defaults?.refetchOnWindowFocus).toBe(false)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/plugins/__tests__/vueQuery.test.ts
```

期待: FAIL（`vueQuery.ts` が存在しない）

- [ ] **Step 3: 実装**

`src/plugins/vueQuery.ts`:

```typescript
import { QueryCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
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

```bash
npx vitest run src/plugins/__tests__/vueQuery.test.ts
```

期待: PASS（3件）

- [ ] **Step 5: プラグイン登録**

`src/plugins/index.ts`:

```typescript
import vuetify from './vuetify'
import router from '@/router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { registerVueQuery } from './vueQuery'
import type { App } from 'vue'

export function registerPlugins(app: App) {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
  registerVueQuery(app)
}
```

- [ ] **Step 6: テストセットアップに vue-query を追加**

`src/test/setup.ts` — テスト毎に新しい QueryClient を作りキャッシュ汚染を防ぐ:

```typescript
import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'

// jsdom にない Vuetify 依存ブラウザ API をモック
Object.defineProperty(window, 'visualViewport', {
  value: {
    width: 375, height: 667, scale: 1,
    offsetLeft: 0, offsetTop: 0,
    addEventListener: () => {}, removeEventListener: () => {},
  },
  writable: true,
})
Object.defineProperty(window, 'ResizeObserver', {
  value: class { observe() {} unobserve() {} disconnect() {} },
  writable: true,
})
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach } from 'vitest'

const vuetify = createVuetify({ components, directives })

beforeEach(() => {
  setActivePinia(createPinia())
  // テスト毎に新しい QueryClient（キャッシュ持ち越し防止・retry 無効で高速化）
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  config.global.plugins = [vuetify, [VueQueryPlugin, { queryClient }]]
})
```

- [ ] **Step 7: 全体確認とコミット**

```bash
npm run type-check
npm run test:run
git add src/plugins/vueQuery.ts src/plugins/__tests__/vueQuery.test.ts src/plugins/index.ts src/test/setup.ts
git commit -m "feat: QueryClient 設定とグローバルエラー通知を追加"
```

---

### Task 5: ProductListPage を useGetProducts へ移行

**Files:**
- Modify: `src/pages/ProductListPage.vue:75-140`（script setup のみ。template・style は変更なし）

**Interfaces:**
- Consumes: `useGetProducts(params)`（Task 1 生成物。`params` は computed ref を渡せる — orval 生成 composable は MaybeRef を受け付け、変化で自動再フェッチ）
- 動作維持: API エラー時はモック JSON でのオフラインフォールバック表示（`isFallback` チップ）を維持

- [ ] **Step 1: script setup を書き換え**

```typescript
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGetProducts } from '@/api/index'
import type { Product, ProductListResponse } from '@/api/index'
import mockProductsData from '@/mocks/products-data.json'
import FlowStepper from '@/components/ui/FlowStepper.vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import SearchConditionChips from '@/components/search/SearchConditionChips.vue'
import { filterProducts } from '@/utils/searchUtils'

const mockProducts = mockProductsData as Product[]

const PAGE_SIZE = 5
const router = useRouter()
const route = useRoute()

const currentPage = ref(1)

const queryQ = computed(() => route.query.q as string | undefined)
const queryCategory = computed(() => route.query.category as Product['category'] | undefined)
const queryInStock = computed(() => route.query.inStock === 'true')

const params = computed(() => ({
  q: queryQ.value,
  category: queryCategory.value,
  inStock: queryInStock.value || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

// vue-query: params の変化で自動再フェッチ・同一 queryKey はキャッシュから即表示
const { data, isLoading, isError } = useGetProducts(params)

const mockFallback = computed<ProductListResponse>(() =>
  filterProducts(
    mockProducts as Product[],
    {
      q: queryQ.value,
      category: queryCategory.value,
      inStock: queryInStock.value,
    },
    currentPage.value,
    PAGE_SIZE,
  ),
)

const isFallback = computed(() => isError.value)
const displayData = computed<ProductListResponse>(() =>
  isFallback.value ? mockFallback.value : (data.value ?? mockFallback.value),
)

function onPageChange(page: number) {
  currentPage.value = page
}

function goDetail(product: Product) {
  router.push(`/detail/${product.id}`)
}
```

変更点の要約: `getProducts` + `useAsync` → `useGetProducts(params)`。`useAsync` の import を削除。それ以外（mockFallback / displayData / template）は変更なし。

注: 生成された `useGetProducts` の第1引数が computed を受け付けない型エラーが出る場合は、生成コードのシグネチャ（`MaybeRef<GetProductsParams>`）を確認し、必要なら `useGetProducts(params, { query: { enabled: true } })` 形式のオプション引数構造に合わせる。

- [ ] **Step 2: 動作確認**

```bash
npm run type-check
npm run test:run
```

期待: 両方成功。

手動確認（任意・推奨）: `npm run dev:mock` で起動し、検索 → 一覧 → ページ切り替えが動くこと、Prism 停止時にオフラインチップが出ることを確認。

- [ ] **Step 3: コミット**

```bash
git add src/pages/ProductListPage.vue
git commit -m "refactor: ProductListPage を useGetProducts に移行"
```

---

### Task 6: MainMenuPage を useGetMenu へ移行し menu ストアを削除

menu ストアの利用者は `MainMenuPage.vue` のみ。サーバーデータ（メニュー）は vue-query キャッシュに移し、ストアは削除する。「失敗時はローカル JSON フォールバック + オフラインチップ」の既存動作を維持する。

**Files:**
- Modify: `src/pages/MainMenuPage.vue`
- Delete: `src/stores/menu.ts`

**Interfaces:**
- Consumes: `useGetMenu()`（Task 1 生成物）
- 動作維持: ローディングバー / オフラインチップ / フォールバックメニュー表示

- [ ] **Step 1: MainMenuPage の script setup を書き換え**

```typescript
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useGetMenu } from '@/api/index'
import type { MenuItem } from '@/api/index'
import fallbackData from '@/data/main-menu.json'

const fallback = fallbackData as MenuItem[]

const router = useRouter()
const sheet = ref(false)
const activeItem = ref<MenuItem | null>(null)

const { data, isLoading, isError } = useGetMenu()

// エラー時はローカル JSON にフォールバック（オフラインモード）
const items = computed<MenuItem[]>(() =>
  isError.value ? fallback : (data.value ?? []),
)

function openSubMenu(item: MenuItem) {
  activeItem.value = item
  sheet.value = true
}

function navigate(to: string) {
  sheet.value = false
  router.push(to)
}
```

- [ ] **Step 2: template のストア参照を置き換え**

`menuStore.isLoading` → `isLoading`、`menuStore.isError` → `isError`、`menuStore.items` → `items` の3箇所:

```html
<v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-4" />
<div v-if="isError" class="mb-4">
  <v-chip color="warning" variant="tonal" size="small" prepend-icon="mdi-wifi-off">
    オフラインモード（ローカルデータ）
  </v-chip>
</div>
<div v-if="!isLoading" class="menu-grid">
  <div v-for="item in items" :key="item.id" class="menu-item" @click="openSubMenu(item)">
```

- [ ] **Step 3: menu ストアを削除**

```bash
rm src/stores/menu.ts
```

削除前に参照が残っていないことを確認:

```bash
grep -r "stores/menu" src/ --include="*.ts" --include="*.vue"
```

期待: ヒットなし（`menuStore.ts` は別ファイルなので注意 — 削除対象は `menu.ts` のみ）。

- [ ] **Step 4: 動作確認とコミット**

```bash
npm run type-check
npm run test:run
git add src/pages/MainMenuPage.vue
git rm src/stores/menu.ts
git commit -m "refactor: MainMenuPage を useGetMenu に移行し menu ストアを削除"
```

---

### Task 7: DetailPage を useGetProductById へ移行し product ストアを削除

現状 DetailPage は `useProductStore` のモック配列から `find` している。生成 composable での取得（「項目 + α での再検索」= id による詳細取得）に置き換える。product ストアの利用者は DetailPage のみのため、ストアは削除する。

**Files:**
- Modify: `src/pages/DetailPage.vue:226-270`（script setup の product 取得部分のみ）
- Delete: `src/stores/product.ts`

**Interfaces:**
- Consumes: `useGetProductById(id)`（Task 1 生成物。`id` は `MaybeRef<number>`）
- 動作維持: 商品が見つからない場合の「商品が見つかりませんでした」表示。API エラー時はモック JSON にフォールバック（ProductListPage と同じオフライン方針）

- [ ] **Step 1: DetailPage の product 取得を書き換え**

script setup の変更箇所:

```typescript
// 削除する import
import { useProductStore } from '@/stores/product'

// 追加する import
import { useGetProductById } from '@/api/index'
import type { Product } from '@/api/index'
import mockProductsData from '@/mocks/products-data.json'
```

```typescript
// 変更前
const store = useProductStore()
// …
const product = computed(() => store.products.find((p) => p.id === Number(props.id)) ?? null)

// 変更後
const mockProducts = mockProductsData as Product[]
const productId = computed(() => Number(props.id))
const { data, isError } = useGetProductById(productId)

// API エラー時はモック JSON にフォールバック（オフラインモード）
const product = computed<Product | null>(() =>
  isError.value
    ? (mockProducts.find((p) => p.id === productId.value) ?? null)
    : (data.value ?? null),
)
```

`const store = useProductStore()` の行を削除。他（memoStore / validate / issues 等）は変更なし。

- [ ] **Step 2: product ストアを削除**

```bash
grep -r "stores/product" src/ --include="*.ts" --include="*.vue"
```

期待: ヒットなし（DetailPage の修正済みなら残りは `product.ts` 自身のみ）。

```bash
rm src/stores/product.ts
```

- [ ] **Step 3: 動作確認とコミット**

```bash
npm run type-check
npm run test:run
git add src/pages/DetailPage.vue
git rm src/stores/product.ts
git commit -m "refactor: DetailPage を useGetProductById に移行し product ストアを削除"
```

---

### Task 8: useAsync 削除と最終検証

**Files:**
- Delete: `src/composables/useAsync.ts`

- [ ] **Step 1: useAsync の参照が残っていないことを確認**

```bash
grep -r "useAsync" src/ --include="*.ts" --include="*.vue"
```

期待: `src/composables/useAsync.ts` 自身のみ。

- [ ] **Step 2: 削除**

```bash
git rm src/composables/useAsync.ts
```

- [ ] **Step 3: 最終検証**

```bash
npm run type-check
npm run test:run
npm run lint
```

期待: すべて成功。

E2E（Prism モック起動が必要なため任意）:

```bash
npm run test:e2e
```

- [ ] **Step 4: コミット**

```bash
git commit -m "refactor: useAsync を削除（vue-query 移行完了)"
```

---

## タスク依存関係

```
Task 1（生成基盤）
  ├─→ Task 2（validated）
  ├─→ Task 3（ApiError）─→ Task 4（QueryClient + 通知）
  │                              ├─→ Task 5（ProductListPage）
  │                              ├─→ Task 6（MainMenuPage）
  │                              └─→ Task 7（DetailPage）
  └────────────────────────────────────→ Task 8（useAsync 削除。Task 5〜7 完了後）
```

Task 2 と Task 3 は独立して並行可能。Task 5〜7 は Task 4 完了後に並行可能。
