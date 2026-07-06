# なぜ Orval + Vue Query を使うのか — 手書きコードとの対比

> **📦 アーカイブ資料**: この資料は orval / vue-query 導入検討期の学習資料です。現行の構成は [guides/orval-zod-data-fetching-flow.md](../guides/orval-zod-data-fetching-flow.md) と [guides/common-layer-architecture.md](../guides/common-layer-architecture.md) を参照してください。

---

## 目次

1. [対比の前提](#対比の前提)
2. [Orval なしの場合: 型定義を手書きする](#orval-なしの場合-型定義を手書きする)
3. [Vue Query なしの場合: データ取得を手書きする](#vue-query-なしの場合-データ取得を手書きする)
4. [両方なしのシーケンス図](#両方なしのシーケンス図)
5. [Orval + Vue Query を使ったシーケンス図](#orval--vue-query-を使ったシーケンス図)
6. [課題別の比較まとめ](#課題別の比較まとめ)

---

## 対比の前提

このプロジェクトの `ProductListPage.vue` を例にとる。
「商品一覧をページネーション付きで取得し、フィルタを変えるたびに再取得する」というシナリオ。

---

## Orval なしの場合: 型定義を手書きする

### Orval あり（現状）

```
openapi/products.yaml を変更
         ↓
npm run orval
         ↓
src/api/products.ts が自動生成される
  - Product インターフェース
  - GetProductsParams 型
  - useGetProducts() フック
  - getGetProductsQueryKey() 関数
  … すべて自動
```

### Orval なし

API 仕様が変わるたびに以下をすべて手書きで更新する。

```typescript
// src/types/product.ts  ← 手書き・手動メンテナンス
export type ProductCategory = '食品' | '電子機器' | 'ファッション' | '家具' | 'スポーツ'

export interface Review {
  id: number
  author: string
  rating: number   // ← API 側で 0〜5 の制約があるが型には反映されない
  comment: string
}

export interface Product {
  id: number
  name: string
  category: ProductCategory
  price: number
  inStock: boolean
  description: string
  rating: number
  reviews: Review[]
}

export interface ProductListResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// クエリパラメータ型も手書き
export interface GetProductsParams {
  q?: string
  category?: ProductCategory
  inStock?: boolean
  page?: number
  pageSize?: number
}
```

```typescript
// src/api/products.ts  ← URL 組み立ても手書き
import type { GetProductsParams, ProductListResponse, Product } from '@/types/product'
import { axiosInstance } from '@/plugins/axios'

export async function getProducts(params: GetProductsParams): Promise<ProductListResponse> {
  const res = await axiosInstance.get('/products', { params })
  return res.data
}

export async function getProductById(id: number): Promise<Product> {
  const res = await axiosInstance.get(`/products/${id}`)
  return res.data
}
```

### どこが辛いか

```
API 仕様変更: price が integer → number に変わった
                         ↓
  openapi/products.yaml を直す
                         ↓
  src/types/product.ts の price: number を確認・修正  ← 手動
  src/types/product.ts の関連型を確認・修正            ← 手動
  手書きの URL 組み立てを確認                          ← 手動
  テストのモック型を確認・修正                          ← 手動
  見落としがあっても TypeScript は教えてくれない        ← バグになる
```

**Orval を使えば `npm run orval` 1コマンドで全部解決する。**

---

## Vue Query なしの場合: データ取得を手書きする

### ❌ 手書き版 ProductListPage.vue

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getProducts } from '@/api/products'
import type { ProductListResponse } from '@/types/product'

const route = useRoute()
const PAGE_SIZE = 5
const currentPage = ref(1)

// ① ローディング・エラー・データを自分で管理
const data = ref<ProductListResponse | null>(null)
const isLoading = ref(false)
const error = ref<unknown>(null)

// ② fetch 関数を自分で書く
async function fetchProducts() {
  isLoading.value = true
  error.value = null
  try {
    const result = await getProducts({
      q: route.query.q as string | undefined,
      category: route.query.category as string | undefined,
      inStock: route.query.inStock === 'true' || undefined,
      page: currentPage.value,
      pageSize: PAGE_SIZE,
    })
    data.value = result
  } catch (e) {
    error.value = e
  } finally {
    isLoading.value = false
  }
}

// ③ マウント時に取得
onMounted(() => {
  fetchProducts()
})

// ④ パラメータが変わったら再取得（watch を自分で書く）
watch(
  () => [
    route.query.q,
    route.query.category,
    route.query.inStock,
    currentPage.value,
  ],
  () => {
    fetchProducts()
  }
)

// ⑤ キャンセル処理（ページ離脱時の残留リクエスト）
let abortController: AbortController | null = null

async function fetchProductsWithCancel() {
  // 前のリクエストをキャンセル
  abortController?.abort()
  abortController = new AbortController()

  isLoading.value = true
  error.value = null
  try {
    const result = await getProducts(
      { page: currentPage.value, pageSize: PAGE_SIZE },
      { signal: abortController.signal }
    )
    data.value = result
  } catch (e) {
    // キャンセルによるエラーは無視
    if ((e as Error).name !== 'AbortError') {
      error.value = e
    }
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  abortController?.abort()
})

function onPageChange(page: number) {
  currentPage.value = page
  // ページ変更時も手動で呼ぶ
  fetchProductsWithCancel()
}
</script>

<template>
  <div>
    <v-progress-linear v-if="isLoading" indeterminate />
    <v-alert v-if="error" type="error">{{ error }}</v-alert>
    <ProductCard
      v-for="product in data?.items"
      :key="product.id"
      :product="product"
    />
  </div>
</template>
```

**問題点の一覧:**

| # | 問題 | 詳細 |
|---|---|---|
| ① | 状態管理コードが多い | `data` / `isLoading` / `error` を毎ページ宣言する |
| ② | fetch 関数が重複 | 他のページでも同じ try/catch/finally パターンを書く |
| ③ | キャッシュがない | 1ページ目に戻るたびに API が叩かれる |
| ④ | 重複リクエスト | 2コンポーネントが同じデータを要求すると2回 HTTP が飛ぶ |
| ⑤ | キャンセル処理 | AbortController を自前で管理しないと残留リクエストが残る |
| ⑥ | watch の管理 | どの値が変わったら再取得すべきかを自分で把握する |
| ⑦ | 「古いデータ」の扱い | バックグラウンド再取得しながら古いデータを見せる UX が難しい |

---

### ✅ Vue Query 版 ProductListPage.vue（現状の実装）

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGetProducts } from '@/api/products'   // Orval が生成

const route = useRoute()
const PAGE_SIZE = 5
const currentPage = ref(1)

const params = computed(() => ({
  q: route.query.q as string | undefined,
  category: route.query.category as string | undefined,
  inStock: route.query.inStock === 'true' || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

// これだけ。上記の手書き版の問題が全部解決している。
const { data, isLoading, isError } = useGetProducts(params)

function onPageChange(page: number) {
  currentPage.value = page  // params が変わると自動で再取得
}
</script>
```

---

## 両方なしのシーケンス図

「検索 → ページ2へ → ページ1に戻る」の操作フロー。

```
ユーザー       SearchPage    ProductListPage     axios      APIサーバー
   │               │                │              │             │
   │ 「検索」クリック│                │              │             │
   │──────────────>│                │              │             │
   │               │ router.push    │              │             │
   │               │───────────────>│              │             │
   │               │                │              │             │
   │               │                │ ①onMounted  │             │
   │               │                │ fetchProducts│             │
   │               │                │──────────────>             │
   │               │                │              │ GET /products?page=1
   │               │                │              │──────────────>
   │               │                │              │<──────────────
   │               │                │<─────────────             │
   │ 一覧表示       │                │              │             │
   │<──────────────────────────────│              │             │
   │               │                │              │             │
   │ ページ2クリック│                │              │             │
   │──────────────────────────────>│              │             │
   │               │                │ ②watch 発火  │             │
   │               │                │ fetchProducts│             │
   │               │                │──────────────>             │
   │               │                │              │ GET /products?page=2
   │               │                │              │──────────────>
   │               │                │              │<──────────────
   │               │                │<─────────────             │
   │ 2ページ表示    │                │              │             │
   │<──────────────────────────────│              │             │
   │               │                │              │             │
   │ ページ1クリック│                │              │             │
   │──────────────────────────────>│              │             │
   │               │                │ ③watch 発火  │             │
   │               │                │ fetchProducts│             │
   │               │                │──────────────>             │
   │               │                │              │ GET /products?page=1
   │               │                │              │──────────────>  ← ③また叩く！
   │               │                │              │<──────────────  キャッシュなし
   │               │                │<─────────────             │
   │ 1ページ表示    │                │              │             │
   │<──────────────────────────────│              │             │
```

**問題点:**
- ① `onMounted` + ② watch の二重管理
- ③ ページ1に戻るたびに同じ API を叩く（キャッシュなし）
- 2つのコンポーネントが同時に同じ API を呼べば **2回リクエストが飛ぶ**

---

## Orval + Vue Query を使ったシーケンス図

同じ操作フロー。

```
ユーザー       SearchPage    ProductListPage   QueryClient    APIサーバー
   │               │                │               │              │
   │ 「検索」クリック│                │               │              │
   │──────────────>│                │               │              │
   │               │ router.push    │               │              │
   │               │───────────────>│               │              │
   │               │                │               │              │
   │               │                │ useGetProducts(params)       │
   │               │                │──────────────>│              │
   │               │                │               │ キャッシュ確認│
   │               │                │               │ ['products',{page:1}]
   │               │                │               │ → なし       │
   │               │                │               │ GET /products?page=1
   │               │                │               │──────────────>
   │               │                │               │<──────────────
   │               │                │               │ キャッシュ保存│
   │               │                │<──────────────│              │
   │ 一覧表示       │                │               │              │
   │<──────────────────────────────│               │              │
   │               │                │               │              │
   │ ページ2クリック│                │               │              │
   │──────────────────────────────>│               │              │
   │               │                │ params変化    │              │
   │               │                │ (page: 2)     │              │
   │               │                │──────────────>│              │
   │               │                │               │ キャッシュ確認│
   │               │                │               │ ['products',{page:2}]
   │               │                │               │ → なし       │
   │               │                │               │ GET /products?page=2
   │               │                │               │──────────────>
   │               │                │               │<──────────────
   │               │                │               │ キャッシュ保存│
   │               │                │<──────────────│              │
   │ 2ページ表示    │                │               │              │
   │<──────────────────────────────│               │              │
   │               │                │               │              │
   │ ページ1クリック│                │               │              │
   │──────────────────────────────>│               │              │
   │               │                │ params変化    │              │
   │               │                │ (page: 1)     │              │
   │               │                │──────────────>│              │
   │               │                │               │ キャッシュ確認│
   │               │                │               │ ['products',{page:1}]
   │               │                │               │ → あり ✅    │
   │               │                │<──────────────│              │
   │ 即座に表示     │                │               │ ※APIは叩かない
   │<──────────────────────────────│               │              │
```

**改善点:**
- `onMounted` も `watch` も不要。`params` が変わるだけで自動再取得
- ページ1に戻るときキャッシュから即返却。API を叩かない
- 2コンポーネントが同じ key を呼んでもリクエストは1回

---

## 課題別の比較まとめ

### 1. ローディング・エラー状態管理

| | 手書き | Vue Query |
|---|---|---|
| 宣言 | `const isLoading = ref(false)` を毎回 | 不要（フックが返す） |
| 更新 | try/finally で手動 | 自動 |
| 漏れリスク | `finally` を忘れると永久ローディング | なし |

```typescript
// 手書き: 毎ページ同じコードを書く
const isLoading = ref(false)
const error = ref(null)
const data = ref(null)
async function fetch() {
  isLoading.value = true
  try { data.value = await api() }
  catch (e) { error.value = e }
  finally { isLoading.value = false }  // ← 忘れるとバグ
}

// Vue Query: 1行
const { data, isLoading, isError, error } = useGetProducts(params)
```

---

### 2. パラメータ変化による自動再取得

| | 手書き | Vue Query |
|---|---|---|
| 実装 | `watch([...], fetchProducts)` を自分で書く | `computed` を渡すだけ |
| 変化の検出 | 自分で依存配列を管理 | Vue の reactivity が自動検出 |
| 漏れリスク | watch の依存配列に入れ忘れると再取得されない | なし |

```typescript
// 手書き: 依存配列の管理が必要
watch(
  () => [route.query.q, route.query.category, currentPage.value],
  () => fetchProducts()   // ← 依存を1つ追加するたびにここも修正
)

// Vue Query: computed を渡すだけ
const params = computed(() => ({
  q: route.query.q,
  page: currentPage.value,
  // ← 新しい依存を追加しても watch の修正は不要
}))
const { data } = useGetProducts(params)
```

---

### 3. キャッシュ

| | 手書き | Vue Query |
|---|---|---|
| 実装 | Map などを自前実装するか毎回 API を叩く | 自動 |
| キーの管理 | 自前 | QueryKey で自動管理 |
| ページ1→2→1 | 3回 API を叩く | 3回目はキャッシュから即返却 |

---

### 4. 重複リクエスト除去

| | 手書き | Vue Query |
|---|---|---|
| 実装 | フラグ管理で自前制御が必要 | 自動（同一 QueryKey は1リクエストに束ねる） |

```
手書き:
  ComponentA → fetchProducts() → HTTP リクエスト①
  ComponentB → fetchProducts() → HTTP リクエスト② ← 同時に2回飛ぶ

Vue Query:
  ComponentA → useGetProducts() → HTTP リクエスト①
  ComponentB → useGetProducts() →  ① の完了を待つ（リクエストは1回）
```

---

### 5. 進行中リクエストのキャンセル

| | 手書き | Vue Query |
|---|---|---|
| 実装 | `AbortController` を自前で管理 | `signal` が自動で渡される |
| ページ離脱時 | `onUnmounted` でキャンセル処理 | 自動 |

```typescript
// 手書き: 毎回これを書く
let controller: AbortController | null = null
async function fetch() {
  controller?.abort()
  controller = new AbortController()
  try {
    const res = await axios.get('/products', { signal: controller.signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return  // キャンセルは無視
    throw e
  }
}
onUnmounted(() => controller?.abort())

// Vue Query: queryFn に signal が自動で渡される（Orval が実装済み）
const queryFn = ({ signal }) => getProducts(params, { signal })
```

---

### 6. 型安全性

| | 手書き | Orval + Vue Query |
|---|---|---|
| 型定義 | `src/types/` に手書き | OpenAPI から自動生成 |
| API 変更時 | 手書きファイルを手動修正 | `npm run orval` で再生成 |
| 不整合リスク | 修正漏れがあるとランタイムエラー | コンパイルエラーで気づける |
| URL の型 | 文字列リテラル（typo しやすい） | 関数化されて typo 不可 |

```typescript
// 手書き: URL を文字列で書くため typo がランタイムまで発覚しない
await axios.get('/prodcts')    // typo → 実行時 404

// Orval: URL 組み立ては生成関数が担う
getGetProductsUrl({ page: 1 }) // → '/products?page=1'
// typo する余地がない
```

---

### 7. コード量の比較

同じ「商品一覧ページ」をフルスクラッチで書いた場合の概算行数:

| 機能 | 手書き | Orval + Vue Query |
|---|---|---|
| 型定義 | 50〜80行 | 0行（生成） |
| API 関数 | 20〜30行 | 0行（生成） |
| QueryKey 管理 | 10〜20行 | 0行（生成） |
| データ取得ロジック | 30〜50行 | 2行 |
| キャッシュ制御 | 50〜100行（自前実装）または 0（なし） | 0行（自動） |
| キャンセル処理 | 15〜20行 | 0行（自動） |
| watch 管理 | 10〜15行 | 0行（computed で代替） |
| **合計** | **185〜315行** | **2行** |

---

### まとめ

```
Orval の役割
  「OpenAPI YAML を書く → 型・フック・URL 関数が自動生成される」
  → API 仕様と実装コードの不整合をなくす
  → 型定義の手書き・手動メンテナンスコストをゼロにする

Vue Query の役割
  「queryFn（fetch 関数）を渡すだけで残りを全部やってくれる」
  → ローディング・エラー状態の管理コストをゼロにする
  → キャッシュ・重複除去・キャンセルを自動化する
  → params を computed にするだけで自動再取得が実現する

組み合わせると
  OpenAPI 仕様 → Orval → 型付きフック → Vue Query → コンポーネントで2行
  という流れが確立し、「API 追加 = YAML に書いて orval を叩く」だけになる
```
