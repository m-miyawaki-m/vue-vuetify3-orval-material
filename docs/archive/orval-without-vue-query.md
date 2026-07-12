# Orval + useAsync — Vue Query なし構成ガイド

> **📦 アーカイブ資料**: この資料は orval / vue-query 導入検討期の学習資料です。現行の構成は [guides/orval-zod-data-fetching-flow.md](../guides/data-fetching/orval-zod-data-fetching-flow.md) と [guides/common-layer-architecture.md](../guides/common-layer-architecture.md) を参照してください。

Vue Query を使わずに Orval の生成コードと自作 `useAsync` composable で
データ取得を実装する方法をまとめる。

Vue Query ありの構成は [`openapi-orval-vue-query.md`](./openapi-orval-vue-query.md) を参照。

---

## 目次

1. [構成の全体像](#構成の全体像)
2. [Vue Query あり / なし の比較](#vue-query-あり--なし-の比較)
3. [セットアップ手順](#セットアップ手順)
4. [生成コードの読み方](#生成コードの読み方)
5. [useAsync composable](#useasync-composable)
6. [コンポーネントでの使い方](#コンポーネントでの使い方)
7. [よくあるパターン](#よくあるパターン)

---

## 構成の全体像

```
openapi/products.yaml
        │
        │ npm run orval
        ▼
src/api/products.ts         ← 型定義 + axios 関数を自動生成
        │
        │ getProductsAPI().getProducts(params)
        ▼
src/composables/useAsync.ts ← loading / error / data を管理する自作 composable
        │
        ▼
src/pages/ProductListPage.vue
```

---

## Vue Query あり / なし の比較

### orval.config.ts

```typescript
// Vue Query あり
output: {
  client: 'vue-query',
  override: {
    mutator: { path: './src/plugins/axios.ts', name: 'customAxiosInstance' },
    query: { useQuery: true },
  },
}

// Vue Query なし（現状）
output: {
  client: 'axios',
  override: {
    mutator: { path: './src/plugins/axios.ts', name: 'customAxiosInstance' },
  },
}
```

### 生成される src/api/products.ts の差

```typescript
// Vue Query あり: useGetProducts() フックが生成される
export function useGetProducts(params?, options?, queryClient?) {
  return useQuery({ queryKey: [...], queryFn: () => getProducts(...) })
}

// Vue Query なし: getProductsAPI() ファクトリ関数が生成される
export const getProductsAPI = () => {
  const getProducts = (params?, options?) =>
    customAxiosInstance({ url: '/products', method: 'GET', params }, options)
  const getProductById = (id, options?) =>
    customAxiosInstance({ url: `/products/${id}`, method: 'GET' }, options)
  return { getProducts, getProductById }
}
```

### コンポーネント側の差

```typescript
// Vue Query あり
import { useGetProducts } from '@/api/products'
const { data, isLoading, isError } = useGetProducts(params)
// data.value?.data が ProductListResponse（ラップされている）

// Vue Query なし
import { getProductsAPI } from '@/api/products'
import { useAsync } from '@/composables/useAsync'
const { getProducts } = getProductsAPI()
const { data, isLoading, isError } = useAsync(
  () => getProducts(params.value),
  params,
)
// data.value が ProductListResponse（直接）
```

---

## セットアップ手順

### 1. orval.config.ts を変更する

```typescript
// orval.config.ts
import { defineConfig } from 'orval'

export default defineConfig({
  products: {
    input: './openapi/products.yaml',
    output: {
      target: './src/api/products.ts',
      client: 'axios',                 // ← 'vue-query' から変更
      override: {
        mutator: {
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
        // query ブロックは不要になる
      },
    },
  },
})
```

### 2. src/plugins/axios.ts を更新する

`client: 'axios'` になると Orval の呼び出しシグネチャが変わる。
第1引数が URL 文字列ではなく AxiosRequestConfig オブジェクトになり、
レスポンスは `response.data` を直接返す形にする。

```typescript
// src/plugins/axios.ts
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

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

> **Vue Query あり構成との違い**
> Vue Query 版は `axios レスポンス全体 { data, status, headers }` を返していたが、
> こちらは `response.data` だけを返す。
> そのためコンポーネントでは `data.value?.data.items` ではなく `data.value?.items` で参照できる。

### 3. npm run orval で再生成する

```bash
npm run orval
```

### 4. VueQueryPlugin を削除する

```typescript
// src/plugins/index.ts
import vuetify from './vuetify'
import router from '@/router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import type { App } from 'vue'

export function registerPlugins(app: App) {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
  // VueQueryPlugin は不要
}
```

---

## 生成コードの読み方

`client: 'axios'` で生成される `src/api/products.ts` の構造:

```typescript
// ① 型定義（Vue Query あり版と同じ）
export interface Product { ... }
export interface ProductListResponse { ... }
export type GetProductsParams = { ... }

// ② ファクトリ関数（API 関数をまとめて返す）
export const getProductsAPI = () => {
  // 商品一覧取得
  const getProducts = (
    params?: GetProductsParams,
    options?: AxiosRequestConfig,
  ): Promise<ProductListResponse> => {
    return customAxiosInstance({ url: '/products', method: 'GET', params }, options)
  }

  // 商品詳細取得
  const getProductById = (
    id: number,
    options?: AxiosRequestConfig,
  ): Promise<Product> => {
    return customAxiosInstance({ url: `/products/${id}`, method: 'GET' }, options)
  }

  return { getProducts, getProductById }
}

// ③ 戻り値の型エイリアス（型推論で使う）
export type GetProductsResult = ...
export type GetProductByIdResult = ...
```

### なぜファクトリ関数（getProductsAPI）なのか

Orval が `client: 'axios'` を選択したとき、複数のエンドポイント関数を1つのオブジェクトにまとめて返す形式を採用している。使う側では分割代入で必要な関数だけ取り出す。

```typescript
// 全部取り出す
const { getProducts, getProductById } = getProductsAPI()

// 必要なものだけ取り出す
const { getProducts } = getProductsAPI()
```

---

## useAsync composable

`src/composables/useAsync.ts`

```typescript
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
    watch(deps, execute, { immediate: true })  // deps の変化を監視しつつ即時実行
  } else {
    execute()                                   // deps なしは初回だけ実行
  }

  return { data, isLoading, isError, error, execute }
}
```

### 返り値

| 値 | 型 | 説明 |
|---|---|---|
| `data` | `Ref<T \| null>` | レスポンスデータ。未取得・エラー時は null |
| `isLoading` | `Ref<boolean>` | リクエスト中は true |
| `isError` | `Ref<boolean>` | 失敗時に true。次の execute() で false に戻る |
| `error` | `Ref<unknown>` | 捕捉したエラーオブジェクト |
| `execute` | `() => Promise<void>` | 手動で再実行したいときに呼ぶ |

### deps に渡すもの

```typescript
// computed を渡す → 値が変わるたびに自動再実行
const params = computed(() => ({ page: currentPage.value }))
const { data } = useAsync(() => getProducts(params.value), params)

// ref を渡す
const id = ref(1)
const { data } = useAsync(() => getProductById(id.value), id)

// 複数の依存
const { data } = useAsync(
  () => getProducts({ page: page.value, q: keyword.value }),
  [page, keyword],
)

// deps なし → マウント時に1回だけ実行
const { data } = useAsync(() => getProducts())
```

---

## コンポーネントでの使い方

### パターン1: 一覧取得（params 変化で自動再取得）

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getProductsAPI } from '@/api/products'
import type { Product, ProductListResponse } from '@/api/products'
import { useAsync } from '@/composables/useAsync'

const { getProducts } = getProductsAPI()

const route = useRoute()
const currentPage = ref(1)

const params = computed(() => ({
  q: route.query.q as string | undefined,
  category: route.query.category as Product['category'] | undefined,
  page: currentPage.value,
  pageSize: 5,
}))

// params が変わるたびに自動で再取得
const { data, isLoading, isError } = useAsync(
  () => getProducts(params.value),
  params,
)

// data.value が直接 ProductListResponse（.data は不要）
const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
</script>

<template>
  <v-progress-linear v-if="isLoading" indeterminate />
  <v-alert v-if="isError" type="warning">オフラインモードで表示中</v-alert>
  <ProductCard v-for="item in items" :key="item.id" :product="item" />
</template>
```

### パターン2: 詳細取得（id が決まってから取得）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { getProductsAPI } from '@/api/products'
import { useAsync } from '@/composables/useAsync'

const props = defineProps<{ id: string }>()
const { getProductById } = getProductsAPI()

const productId = computed(() => Number(props.id))

const { data: product, isLoading, isError } = useAsync(
  () => getProductById(productId.value),
  productId,
)

// product.value が直接 Product
</script>
```

### パターン3: エラー時のフォールバック（現プロジェクトのパターン）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { getProductsAPI } from '@/api/products'
import type { ProductListResponse } from '@/api/products'
import { useAsync } from '@/composables/useAsync'
import { mockProducts } from '@/mocks/products'
import { filterProducts } from '@/utils/searchUtils'

const { getProducts } = getProductsAPI()
const params = computed(() => ({ page: 1, pageSize: 5 }))

const { data, isLoading, isError } = useAsync(
  () => getProducts(params.value),
  params,
)

// API 失敗時はモックデータで代替
const mockFallback = computed<ProductListResponse>(() =>
  filterProducts(mockProducts, {}, 1, 5)
)

const displayData = computed(() =>
  isError.value ? mockFallback.value : (data.value ?? mockFallback.value)
)
</script>
```

### パターン4: 手動リフレッシュ

```vue
<script setup lang="ts">
import { getProductsAPI } from '@/api/products'
import { useAsync } from '@/composables/useAsync'

const { getProducts } = getProductsAPI()

// deps なし → 初回マウント時に1回だけ実行
const { data, isLoading, execute: refresh } = useAsync(() => getProducts())
</script>

<template>
  <v-btn @click="refresh">更新</v-btn>
</template>
```

### パターン5: POST / PUT / DELETE（送信処理）

`useAsync` は GET 向けだが、送信も同じ仕組みで書ける。
ただし自動実行させず、ボタン押下時だけ実行したい場合は `execute` を使う。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { getProductsAPI } from '@/api/products'
import { useAsync } from '@/composables/useAsync'

const { getProducts } = getProductsAPI()
const form = ref({ name: '', price: 0 })

// deps なし + 即時実行しない場合は自前で管理
const isLoading = ref(false)
const isError = ref(false)

async function submit() {
  isLoading.value = true
  isError.value = false
  try {
    // POST/PUT は Orval が生成した関数を直接呼ぶ
    // await createProduct(form.value)
    // 成功後は一覧を再取得するなど
  } catch {
    isError.value = true
  } finally {
    isLoading.value = false
  }
}
</script>
```

> **POST/PUT/DELETE の場合**
> `useAsync` の `execute` を手動で呼ぶことで対応できるが、
> ボタン連打防止や楽観的更新が必要になると自前実装が必要になる。
> その場合は Vue Query の `useMutation` が有効な場面ではある。

---

## Vue Query あり / なし の使い分け指針

| 状況 | 推奨 |
|---|---|
| 検索→一覧→詳細のシンプルな画面遷移 | **useAsync で十分** |
| 複数コンポーネントが同じデータを参照 | Vue Query のキャッシュが有効 |
| 画面遷移後にキャッシュから即表示したい | Vue Query の gcTime が有効 |
| POST後に関連する一覧を自動更新したい | Vue Query の invalidateQueries が有効 |
| チームが小さく依存を減らしたい | **useAsync で十分** |
