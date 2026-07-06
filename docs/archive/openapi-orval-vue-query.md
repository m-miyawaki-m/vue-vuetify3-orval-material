# OpenAPI → Orval → Vue Query 開発ガイド

> **📦 アーカイブ資料**: この資料は orval / vue-query 導入検討期の学習資料です。現行の構成は [guides/orval-zod-data-fetching-flow.md](../guides/orval-zod-data-fetching-flow.md) と [guides/common-layer-architecture.md](../guides/common-layer-architecture.md) を参照してください。

このプロジェクトでの API 連携フロー全体をまとめたガイドです。

---

## 目次

1. [全体フロー](#全体フロー)
2. [OpenAPI YAML の書き方](#openapi-yaml-の書き方)
3. [Orval による型・フック生成](#orval-による型フック生成)
4. [Vue Query との連携](#vue-query-との連携)
5. [新しいエンドポイントを追加するときの手順](#新しいエンドポイントを追加するときの手順)
6. [JSON ファイルでテストデータを管理する](#json-ファイルでテストデータを管理する)

---

## 全体フロー

```
openapi/*.yaml          orval.config.ts        src/api/*.ts
   (API定義)    ──────→  (生成設定)   ──────→  (自動生成コード)
                                                    │
                                                    ▼
                                          Vue コンポーネントで
                                          useXxx() を呼ぶだけ
```

**モック開発時のフロー:**
```
openapi/*.yaml ──→ Prism (ポート4010) ──→ axios ──→ Vue Query
                   npm run mock:prism
```

**本番時のフロー:**
```
実際の API サーバー ──→ axios ──→ Vue Query
  (VITE_API_BASE_URL)
```

---

## OpenAPI YAML の書き方

### ファイルの置き場所

```
openapi/
  products.yaml    ← エンドポイント単位で分ける
  orders.yaml
  users.yaml
```

### 基本構造

```yaml
openapi: 3.0.3
info:
  title: Products API   # API名（Orvalの生成コメントに使われる）
  version: 1.0.0

paths:
  # エンドポイントの定義
  /products:
    get:
      operationId: getProducts   # ← 重要: Orvalがこれを関数名の元にする
      summary: 商品一覧取得
      parameters: [...]
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListResponse'

components:
  schemas:
    # 型定義
    Product:
      type: object
      required: [id, name]
      properties:
        id:
          type: integer
        name:
          type: string
```

### operationId の命名規則

`operationId` が Orval の生成物の名前を決める。**必ず設定すること。**

| operationId | 生成される関数 | 生成される Vue Query フック |
|---|---|---|
| `getProducts` | `getProducts()` | `useGetProducts()` |
| `getProductById` | `getProductById()` | `useGetProductById()` |
| `createProduct` | `createProduct()` | `useCreateProduct()` (mutation) |
| `updateProduct` | `updateProduct()` | `useUpdateProduct()` (mutation) |
| `deleteProduct` | `deleteProduct()` | `useDeleteProduct()` (mutation) |

### パラメータの定義

```yaml
parameters:
  # クエリパラメータ（?page=1&pageSize=5 のような形式）
  - name: page
    in: query
    required: false          # 省略可能なら false
    schema:
      type: integer
      minimum: 1
      default: 1

  # パスパラメータ（/products/{id} の {id} 部分）
  - name: id
    in: path
    required: true           # パスパラメータは必ず true
    schema:
      type: integer

  # リクエストヘッダー
  - name: X-Request-Id
    in: header
    schema:
      type: string
```

### スキーマ（型）の定義

#### プリミティブ型

```yaml
components:
  schemas:
    MySchema:
      type: object
      required: [id, name, price, inStock]   # 必須フィールドをここに列挙
      properties:
        id:
          type: integer          # → number
        name:
          type: string           # → string
        price:
          type: number           # → number (小数あり)
          minimum: 0
        inStock:
          type: boolean          # → boolean
        description:
          type: string
          nullable: true         # → string | null
```

#### 列挙型（Union型になる）

```yaml
# Orval が TypeScript の const object + type として生成する
ProductCategory:
  type: string
  enum:
    - 食品
    - 電子機器
    - ファッション
```

生成結果:
```typescript
export type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory];

export const ProductCategory = {
  食品: '食品',
  電子機器: '電子機器',
  ファッション: 'ファッション',
} as const;
```

#### 配列型

```yaml
reviews:
  type: array
  items:
    $ref: '#/components/schemas/Review'   # 別スキーマを参照
```

#### $ref による参照

```yaml
# 同ファイル内を参照
category:
  $ref: '#/components/schemas/ProductCategory'

# 別ファイルを参照（openapi/ フォルダ間で共通型を使いまわす場合）
product:
  $ref: './common.yaml#/components/schemas/Product'
```

### レスポンスの定義

```yaml
responses:
  '200':
    description: 成功
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ProductListResponse'
        # example はモックサーバー(Prism)が返すデータとして使われる
        example:
          items:
            - id: 1
              name: オーガニック緑茶
              price: 1200
          total: 50
          page: 1
          pageSize: 5
          totalPages: 10

  '404':
    description: 見つからない
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'

  '400':
    description: バリデーションエラー
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ValidationError'
```

### POST / PUT / PATCH エンドポイント（ミューテーション系）

```yaml
/products:
  post:
    operationId: createProduct
    summary: 商品作成
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateProductRequest'
          example:
            name: 新商品
            category: 食品
            price: 1000
            inStock: true
            description: 説明文
    responses:
      '201':
        description: 作成成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Product'
      '400':
        description: バリデーションエラー
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ValidationError'

/products/{id}:
  put:
    operationId: updateProduct
    summary: 商品更新（全項目）
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateProductRequest'
    responses:
      '200':
        description: 更新成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Product'

  delete:
    operationId: deleteProduct
    summary: 商品削除
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    responses:
      '204':
        description: 削除成功（レスポンスボディなし）
```

### リクエストボディの型定義（Create/Update 用）

```yaml
components:
  schemas:
    # 作成用（id は不要）
    CreateProductRequest:
      type: object
      required: [name, category, price, inStock, description]
      properties:
        name:
          type: string
        category:
          $ref: '#/components/schemas/ProductCategory'
        price:
          type: integer
          minimum: 0
        inStock:
          type: boolean
        description:
          type: string

    # 更新用（PATCH なら全項目 optional にする）
    UpdateProductRequest:
      type: object
      properties:
        name:
          type: string
        price:
          type: integer
          minimum: 0
        inStock:
          type: boolean
```

---

## Orval による型・フック生成

### orval.config.ts の構成

```typescript
// orval.config.ts
import { defineConfig } from 'orval'

export default defineConfig({
  // キー名が生成される名前空間になる（複数定義可）
  products: {
    input: './openapi/products.yaml',     // 読み込む OpenAPI ファイル
    output: {
      target: './src/api/products.ts',    // 生成先ファイル
      client: 'vue-query',                // vue-query 用フック生成
      override: {
        mutator: {
          // axios インスタンスのカスタマイズ
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
        query: {
          useQuery: true,   // useQuery フックを生成する
        },
      },
    },
  },

  // 別 API を追加する場合
  orders: {
    input: './openapi/orders.yaml',
    output: {
      target: './src/api/orders.ts',
      client: 'vue-query',
      override: {
        mutator: {
          path: './src/plugins/axios.ts',
          name: 'customAxiosInstance',
        },
        query: {
          useQuery: true,
        },
      },
    },
  },
})
```

### コード生成コマンド

```bash
npm run orval
```

このコマンドで `src/api/products.ts` が上書き生成される。**生成ファイルは手動編集しないこと。**

### 生成されるものの一覧

`operationId: getProducts` の場合:

| 生成物 | 説明 |
|---|---|
| `interface Product` | スキーマの TypeScript 型 |
| `type ProductCategory` | enum の型 |
| `const ProductCategory` | enum の定数オブジェクト |
| `type GetProductsParams` | クエリパラメータの型 |
| `getGetProductsUrl(params)` | URL 組み立て関数 |
| `getProducts(params)` | axios を直接呼ぶ関数 |
| `getGetProductsQueryKey(params)` | Vue Query のキャッシュキー |
| `getGetProductsQueryOptions(params)` | useQuery に渡すオプション |
| `useGetProducts(params, options)` | Vue コンポーネントで使うフック |

`operationId: createProduct` (POST) の場合:

| 生成物 | 説明 |
|---|---|
| `createProduct(data)` | axios を直接呼ぶ関数 |
| `useCreateProduct(options)` | useMutation フック |

### axios カスタマイズ（src/plugins/axios.ts）

```typescript
import axios from 'axios'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// Orval が呼ぶカスタムインスタンス
// Orval の生成型 { data, status, headers } に合わせて
// axios レスポンス全体をそのまま返す
export const customAxiosInstance = <T>(url: string, config?: any): Promise<T> => {
  return axiosInstance({ url, ...config }) as unknown as Promise<T>
}
```

> **なぜ `as unknown as Promise<T>` なのか**
> Orval の `vue-query` クライアントは `{ data, status, headers }` 型を期待するが、
> axios の `AxiosResponse` 型と完全には一致しないため、型アサーションで吸収している。

---

## Vue Query との連携

### セットアップ確認（src/plugins/index.ts）

```typescript
import { VueQueryPlugin } from '@tanstack/vue-query'

app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        retry: false,               // 失敗時の自動リトライをしない
        refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得をしない
      },
    },
  },
})
```

---

### パターン1: 一覧取得（useGetProducts）

生成フックのシグネチャ:

```typescript
function useGetProducts<TData, TError>(
  params?: MaybeRef<GetProductsParams>,  // リアクティブに変更できる
  options?: { query?: Partial<UseQueryOptions<...>> },
  queryClient?: QueryClient
): UseQueryReturnType<TData, TError> & { queryKey: ... }
```

#### 基本的な使い方

```vue
<script setup lang="ts">
import { useGetProducts } from '@/api/products'
import type { ProductListResponse } from '@/api/products'

// フックを呼ぶだけで自動的にリクエストが走る
const { data, isLoading, isError, error } = useGetProducts()

// data の型: Ref<getProductsResponse | undefined>
// data.value?.data が ProductListResponse
</script>

<template>
  <div v-if="isLoading">読み込み中...</div>
  <div v-else-if="isError">エラー: {{ error }}</div>
  <div v-else>
    <div v-for="item in data?.data.items" :key="item.id">
      {{ item.name }}
    </div>
  </div>
</template>
```

#### リアクティブなパラメータで絞り込み・ページネーション

`params` に `ref` や `computed` を渡すと、値が変わるたびに自動で再取得される。

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGetProducts } from '@/api/products'
import type { Product, ProductListResponse } from '@/api/products'

const route = useRoute()
const currentPage = ref(1)
const PAGE_SIZE = 5

// computed でパラメータをまとめる
// currentPage や route.query が変わると自動で再フェッチ
const params = computed(() => ({
  q: route.query.q as string | undefined,
  category: route.query.category as Product['category'] | undefined,
  inStock: route.query.inStock === 'true' || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

const { data, isLoading, isError } = useGetProducts(params)

// data.value?.data が ProductListResponse | undefined
const listData = computed<ProductListResponse | null>(
  () => data.value?.data ?? null
)

function onPageChange(page: number) {
  currentPage.value = page   // これだけで自動再取得
}
</script>
```

#### エラー時のフォールバック（オフラインモック）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useGetProducts } from '@/api/products'
import type { ProductListResponse, Product } from '@/api/products'
import { mockProducts } from '@/mocks/products'
import { filterProducts } from '@/utils/searchUtils'

const params = computed(() => ({ page: 1, pageSize: 5 }))
const { data, isLoading, isError } = useGetProducts(params)

// API が失敗したときにモックデータで代替
const mockFallback = computed<ProductListResponse>(() =>
  filterProducts(mockProducts as Product[], {}, 1, 5)
)

const isFallback = computed(() => isError.value)

const displayData = computed<ProductListResponse>(() =>
  isFallback.value
    ? mockFallback.value
    : (data.value?.data ?? mockFallback.value)
)
</script>

<template>
  <!-- オフライン通知 -->
  <v-chip v-if="isFallback" color="warning">
    オフラインモード（モックデータ）
  </v-chip>

  <v-progress-linear v-if="isLoading" indeterminate />

  <ProductCard
    v-for="product in displayData.items"
    :key="product.id"
    :product="product"
  />
</template>
```

---

### パターン2: 詳細取得（useGetProductById）

生成フックのシグネチャ:

```typescript
function useGetProductById<TData, TError>(
  id: MaybeRef<number>,  // id が null/undefined のとき自動で無効化される
  options?: { query?: Partial<UseQueryOptions<...>> },
  queryClient?: QueryClient
): UseQueryReturnType<TData, TError>
```

> Orval は id パラメータが null/undefined のとき `enabled: false` を自動で設定する。
> これにより、id が決まる前にリクエストが飛ぶことがない。

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useGetProductById } from '@/api/products'
import type { Product } from '@/api/products'

const props = defineProps<{ id: string }>()

// string の id を number に変換
const productId = computed(() => Number(props.id))

// id が NaN のときも enabled: false になるよう明示的に制御することを推奨
const { data, isLoading, isError } = useGetProductById(productId)

// data.value?.data が Product | undefined
const product = computed<Product | null>(
  () => (data.value as any)?.data ?? null
)
</script>

<template>
  <div v-if="isLoading">読み込み中...</div>
  <div v-else-if="isError">商品が見つかりませんでした</div>
  <div v-else-if="product">
    <h1>{{ product.name }}</h1>
    <p>¥{{ product.price.toLocaleString() }}</p>
  </div>
</template>
```

---

### パターン3: POST/PUT/DELETE（useMutation）

Orval が `createProduct`（POST）を生成した場合:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useCreateProduct } from '@/api/products'
import type { CreateProductRequest } from '@/api/products'
import { useQueryClient } from '@tanstack/vue-query'
import { getGetProductsQueryKey } from '@/api/products'

const queryClient = useQueryClient()

// useMutation は自動実行されない（mutate() を明示的に呼ぶ）
const {
  mutate,          // 実行関数（結果をコールバックで受け取る）
  mutateAsync,     // 実行関数（Promise を返す）
  isPending,       // 送信中フラグ
  isError,
  error,
} = useCreateProduct({
  mutation: {
    onSuccess: (response) => {
      // 成功後にキャッシュを無効化して一覧を再取得させる
      queryClient.invalidateQueries({
        queryKey: getGetProductsQueryKey(),
      })
      console.log('作成成功:', response.data)
    },
    onError: (error) => {
      console.error('作成失敗:', error)
    },
  },
})

const form = ref<CreateProductRequest>({
  name: '',
  category: '食品',
  price: 0,
  inStock: true,
  description: '',
})

function submit() {
  mutate({ data: form.value })
}

// async/await で書く場合
async function submitAsync() {
  try {
    const result = await mutateAsync({ data: form.value })
    // 成功処理
  } catch (e) {
    // エラー処理
  }
}
</script>

<template>
  <v-btn :loading="isPending" @click="submit">作成</v-btn>
  <v-alert v-if="isError" type="error">作成に失敗しました</v-alert>
</template>
```

---

### パターン4: 条件付きフェッチ（enabled オプション）

特定の条件を満たすまでリクエストを遅延させたいとき:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGetProducts } from '@/api/products'

const isAuthenticated = ref(false)
const searchQuery = ref('')

const params = computed(() => ({ q: searchQuery.value }))

const { data, isLoading } = useGetProducts(params, {
  query: {
    // isAuthenticated が true になるまでフェッチしない
    enabled: computed(() => isAuthenticated.value),
  },
})
</script>
```

---

### パターン5: select でデータ変換

API レスポンスをそのまま使うのではなく、変換して使いたいとき:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useGetProducts } from '@/api/products'

const { data: productNames } = useGetProducts(
  { pageSize: 100 },
  {
    query: {
      // data が変換済みの型になる
      select: (response) =>
        response.data.items.map((p) => ({ id: p.id, label: p.name })),
    },
  }
)
// productNames.value は { id: number; label: string }[] | undefined
</script>
```

---

### パターン6: 手動でキャッシュを操作する

```vue
<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query'
import { getGetProductsQueryKey, getGetProductByIdQueryKey } from '@/api/products'

const queryClient = useQueryClient()

// 一覧キャッシュを無効化（次回アクセス時に再取得）
function invalidateList() {
  queryClient.invalidateQueries({
    queryKey: getGetProductsQueryKey(),
  })
}

// 特定の商品のキャッシュを無効化
function invalidateDetail(id: number) {
  queryClient.invalidateQueries({
    queryKey: getGetProductByIdQueryKey(id),
  })
}

// キャッシュを即座に上書き（楽観的更新など）
function updateCachedProduct(id: number, patch: Partial<Product>) {
  queryClient.setQueryData(
    getGetProductByIdQueryKey(id),
    (old: any) => old ? { ...old, data: { ...old.data, ...patch } } : old
  )
}
</script>
```

---

### パターン7: ローディング・エラー状態の一元管理

複数のクエリをまとめて管理したいとき:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useGetProducts, useGetProductById } from '@/api/products'

const { data: list, isLoading: listLoading, isError: listError } = useGetProducts()
const { data: detail, isLoading: detailLoading, isError: detailError } = useGetProductById(1)

// まとめてローディング判定
const isLoading = computed(() => listLoading.value || detailLoading.value)
const isError = computed(() => listError.value || detailError.value)
</script>
```

---

## 新しいエンドポイントを追加するときの手順

### ステップ 1: OpenAPI YAML に定義を追加

```yaml
# openapi/products.yaml に追記
/products/{id}/reviews:
  post:
    operationId: createReview
    summary: レビュー投稿
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateReviewRequest'
    responses:
      '201':
        description: レビュー作成成功
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Review'
```

### ステップ 2: スキーマも追加

```yaml
# components/schemas に追記
CreateReviewRequest:
  type: object
  required: [rating, comment]
  properties:
    rating:
      type: integer
      minimum: 1
      maximum: 5
    comment:
      type: string
```

### ステップ 3: Orval でコード再生成

```bash
npm run orval
```

`src/api/products.ts` が更新され、以下が自動生成される:
- `CreateReviewRequest` インターフェース
- `createReview(id, data)` 関数
- `useCreateReview(options)` フック

### ステップ 4: Vue コンポーネントで使う

```vue
<script setup lang="ts">
import { useCreateReview } from '@/api/products'
import type { CreateReviewRequest } from '@/api/products'

const { mutate: submitReview, isPending } = useCreateReview()

function onSubmit(productId: number, body: CreateReviewRequest) {
  submitReview({ id: productId, data: body })
}
</script>
```

### ステップ 5: モックサーバーで動作確認

```bash
npm run dev:mock   # フロント + Prism を同時起動
```

Prism は YAML の `example` セクションのデータを返す。POST/PUT/DELETE は
YAML に定義されたレスポンス型の形式で自動的にモックレスポンスを返す。

---

## よくあるハマりポイント

### data.value の型が深い

Orval の vue-query クライアントはレスポンス全体 `{ data, status, headers }` を返す。

```typescript
// NG: data.value が ProductListResponse だと思いがち
const items = data.value?.items

// OK: data.value?.data が実際のレスポンス
const items = data.value?.data.items
```

### params に undefined を渡すとフィルタが消える

```typescript
// NG: undefined が文字列 "undefined" になる可能性
const params = computed(() => ({
  q: searchQuery.value || undefined,   // OK: 空文字のとき省く
  inStock: filterInStock.value,        // false が渡ると ?inStock=false になる
}))

// OK: boolean フィルタは undefined で「未指定」を表す
const params = computed(() => ({
  inStock: filterInStock.value ? true : undefined,
}))
```

### MaybeRef とは

Orval が生成するフックは `MaybeRef<T>` = `T | Ref<T>` を受け取る。

```typescript
// 以下はどちらも正しい
useGetProductById(1)              // number をそのまま渡す
useGetProductById(ref(1))         // Ref<number> を渡す
useGetProductById(computed(...))  // ComputedRef<number> を渡す（最推奨）
```

### 生成コードを手動編集しない

`src/api/*.ts` は `npm run orval` のたびに上書きされる。
型の追加・拡張は別ファイルに書くこと:

```typescript
// src/types/product-extended.ts
import type { Product } from '@/api/products'

// 拡張型は別ファイルで定義
export interface ProductWithMemo extends Product {
  memo: string
}
```

---

## JSON ファイルでテストデータを管理する

テストデータを `.ts` に直書きせず JSON ファイルに分離することで、
モックサーバー（Prism）・ユニットテスト・コンポーネントテストの3箇所で同じデータを使い回せる。

### ファイル構成

```
openapi/
  products.yaml
  examples/
    products-list.json     ← Prism が返す一覧レスポンス
    product-detail.json    ← Prism が返す詳細レスポンス

src/
  mocks/
    products.ts            ← JSON を import してアプリ内フォールバックに使う
  fixtures/                ← テスト専用フィクスチャ（テストコード以外からは import しない）
    product.fixture.ts     ← 単一商品・バリエーション
    products-list.fixture.ts ← 一覧レスポンス
```

---

### 手法1: Prism モックサーバーに JSON を読み込ませる

OpenAPI YAML の `example` に外部 JSON を参照させる（`$ref` の `externalValue`）。

```yaml
# openapi/products.yaml
paths:
  /products:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListResponse'
              # examples キーで外部 JSON を参照
              examples:
                default:
                  externalValue: './examples/products-list.json'
```

`externalValue` を使うと Prism は JSON ファイルをそのまま返すレスポンスとして使う。

> **注意**: Prism v4 は `externalValue` を部分サポート。動作しない場合は
> `example:` ブロックに直接インライン記述するか、下記の `--mock-dynamic` オプションを検討する。

**安定した代替手段**: YAML の `example` ブロックに JSON の中身を直書き（現状のプロジェクトの方式）:

```yaml
example:
  items:
    - id: 1
      name: オーガニック緑茶
      # ... JSON と同じ内容を YAML 形式で記述
```

---

### 手法2: アプリのフォールバックモックに JSON を使う

`src/mocks/products.ts` で JSON ファイルを import して型を当てる。

```typescript
// src/mocks/products.ts
import type { Product } from '@/api/products'
import rawList from '../../openapi/examples/products-list.json'

// JSON の items 配列を Product[] として使う
export const mockProducts: Product[] = rawList.items as Product[]
```

`vite.config.ts` に `resolveJsonModule` は不要（Vite は JSON import をデフォルト対応）。
TypeScript 側は `tsconfig.json` に `"resolveJsonModule": true` が必要:

```json
// tsconfig.json（または tsconfig.app.json）
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

---

### 手法3: テスト専用フィクスチャを JSON から生成する

ユニットテスト・コンポーネントテストで使う型付きフィクスチャを `src/fixtures/` に置く。

#### フィクスチャファイルの作り方

```typescript
// src/fixtures/product.fixture.ts
import type { Product, ProductListResponse } from '@/api/products'

// ベースとなる1件のデータ
export const productFixture: Product = {
  id: 1,
  name: 'オーガニック緑茶',
  category: '食品',
  price: 1200,
  inStock: true,
  description: '厳選された国産茶葉を使用した風味豊かな緑茶。',
  rating: 4,
  reviews: [
    { id: 1, author: '田中太郎', rating: 5, comment: '香りが良く飲みやすいです。' },
  ],
}

// バリエーション: 在庫なし
export const outOfStockProductFixture: Product = {
  ...productFixture,
  id: 2,
  name: '天然蜂蜜',
  inStock: false,
}

// ヘルパー: 任意のフィールドを上書きして生成
export function buildProduct(overrides: Partial<Product> = {}): Product {
  return { ...productFixture, ...overrides }
}
```

```typescript
// src/fixtures/products-list.fixture.ts
import type { ProductListResponse } from '@/api/products'
import { productFixture } from './product.fixture'

export const productsListFixture: ProductListResponse = {
  items: [productFixture],
  total: 1,
  page: 1,
  pageSize: 5,
  totalPages: 1,
}

// ページネーション検証用: 複数ページがある状態
export function buildProductsList(
  items: ProductListResponse['items'],
  page = 1,
  total = items.length,
): ProductListResponse {
  const pageSize = 5
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
```

#### JSON ファイルから直接フィクスチャを生成する場合

```typescript
// src/fixtures/products-list.fixture.ts（JSON ベース版）
import type { ProductListResponse } from '@/api/products'
import rawList from '../../openapi/examples/products-list.json'

// JSON をそのまま型付きフィクスチャとして export
export const productsListFixture = rawList as ProductListResponse
```

---

### 手法4: Vitest でフィクスチャを使う

#### コンポーネントテスト（ProductCard）

```typescript
// src/components/product/__tests__/ProductCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductCard from '../ProductCard.vue'
import { buildProduct } from '@/fixtures/product.fixture'

describe('ProductCard', () => {
  it('在庫なし商品は「在庫なし」チップを表示', () => {
    const product = buildProduct({ inStock: false })  // フィクスチャから生成
    const wrapper = mount(ProductCard, { props: { product } })
    expect(wrapper.text()).toContain('在庫なし')
  })

  it('価格が正しくフォーマットされる', () => {
    const product = buildProduct({ price: 12000 })
    const wrapper = mount(ProductCard, { props: { product } })
    expect(wrapper.text()).toContain('12,000')
  })
})
```

#### Vue Query フックのテスト（useGetProducts をモック）

`@tanstack/vue-query` の `QueryClient` を使ってキャッシュにデータを注入する方法:

```typescript
// src/pages/__tests__/ProductListPage.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import ProductListPage from '../ProductListPage.vue'
import { productsListFixture } from '@/fixtures/products-list.fixture'
import { getGetProductsQueryKey } from '@/api/products'

// vue-router をスタブ
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useRoute: () => ({ query: { q: '緑茶' } }),
  }
})

describe('ProductListPage', () => {
  it('取得した商品一覧をリスト表示する', async () => {
    // QueryClient を作成してキャッシュにフィクスチャを注入
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(
      getGetProductsQueryKey({ q: '緑茶', page: 1, pageSize: 5 }),
      { data: productsListFixture, status: 200 },
    )

    const wrapper = mount(ProductListPage, {
      global: {
        plugins: [
          [VueQueryPlugin, { queryClient }],
        ],
      },
    })

    await flushPromises()

    // フィクスチャの商品名が表示されることを確認
    expect(wrapper.text()).toContain(productsListFixture.items[0].name)
  })
})
```

#### API 関数自体をモックする方法（`vi.mock`）

QueryClient を使わず、生成された API 関数ごと差し替える方法:

```typescript
import { vi } from 'vitest'
import * as productsApi from '@/api/products'
import { productsListFixture } from '@/fixtures/products-list.fixture'

// useGetProducts フック全体をモック
vi.mock('@/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/products')>()
  return {
    ...actual,
    useGetProducts: () => ({
      data: { value: { data: productsListFixture, status: 200 } },
      isLoading: { value: false },
      isError: { value: false },
    }),
  }
})
```

> **使い分け**
> - `QueryClient.setQueryData` — フックの挙動（ローディング状態遷移など）も含めてテストしたいとき
> - `vi.mock('@/api/products')` — レンダリング結果だけ確認したい軽量なテストのとき

---

### JSON ファイルの管理方針まとめ

| ファイル | 用途 | 更新タイミング |
|---|---|---|
| `openapi/examples/*.json` | Prism モックサーバーのレスポンス・YAML の example 参照 | API 仕様変更時 |
| `src/mocks/products.ts` | アプリ内オフラインフォールバック | データを増やしたいとき |
| `src/fixtures/*.fixture.ts` | ユニット・コンポーネントテスト用フィクスチャ | テスト追加・仕様変更時 |

**原則**: テストコードは `fixtures/` を import する。`mocks/` は本番コードのフォールバック専用。
`openapi/examples/` の JSON は Prism 用なので本番コード・テストコードから直接 import しない。
