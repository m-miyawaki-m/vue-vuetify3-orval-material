# OpenAPI → Orval → Vue Query 開発ガイド

このプロジェクトでの API 連携フロー全体をまとめたガイドです。

---

## 目次

1. [全体フロー](#全体フロー)
2. [OpenAPI YAML の書き方](#openapi-yaml-の書き方)
3. [Orval による型・フック生成](#orval-による型フック生成)
4. [Vue Query との連携](#vue-query-との連携)
5. [新しいエンドポイントを追加するときの手順](#新しいエンドポイントを追加するときの手順)

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
