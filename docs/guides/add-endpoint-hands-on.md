# ハンズオン: api.yaml に新エンドポイントを追加して画面まで通す

`openapi/api.yaml` に新しい GET エンドポイントを追加し、`npm run orval` で生成された型・composable・zod スキーマを使って、実際に画面に表示するところまでを一気通貫で体験する演習。

関連ドキュメント（本書と役割分担）:

- 全体のフローチャート・ファイル一覧: [new-page-flow.md](./new-page-flow.md)
- orval / zod / vue-query の仕組みの解説: [orval-zod-data-fetching-flow.md](./orval-zod-data-fetching-flow.md)
- 手順のテンプレート版（抽象形）: [team-guide.md](./team-guide.md) §3「新しい API を使いたい」— 本書はその具体的な一巡演習

本書はそれらを読んだ前提で、**1本の具体的なエンドポイント（`GET /categories`）を最初から最後まで実装する手順**だけに絞る。仕組みの説明は上記2本を参照。

> 演習なので、この文書自体には yaml や src への変更は含まれていない。手を動かして自分の環境に適用すること。

---

## 0. ゴールと完成条件

題材は **`GET /categories`（カテゴリごとの商品件数一覧）**。既存の `/products` が `category` クエリでフィルタできるのに対し、「どのカテゴリに何件あるか」を返す一覧系エンドポイントを新設し、それをタップすると `/products?category=xxx` に遷移するカテゴリ一覧画面を作る。

`ProductCategory`（`食品` / `電子機器` / `ファッション` / `家具` / `スポーツ`）という既存 enum をレスポンスの中で再利用する点が、`/menu` や `/products` の写経では学べない実践ポイントになる。

以下がすべて満たせたら合格:

1. `openapi/api.yaml` に `getCategories` が追加され、`npx prism mock` がバリデーションエラーなく起動する
2. `npm run orval` 実行後、`src/api/index.ts` に `useGetCategories` が、`src/types/api/` に `CategorySummary` 型が、`src/api/index.zod.ts` に `GetCategoriesResponse` が生成されている
3. `src/composables/queries/useCategories.ts` がローカル JSON フォールバック込みで動く
4. `/categories` にアクセスするとカテゴリ一覧カードが表示される（API 未起動時はオフラインチップ付きでフォールバック表示）
5. `useCategories` の単体テストが green
6. `npm run dev:mock` 起動中は `/categories` が Prism の応答（フォールバックではなく実データ扱い）で表示される

---

## Step 1: api.yaml にエンドポイントを追加

### 1-1. path の追加

`openapi/api.yaml` の `/products/{id}` ブロックの直後、`components:` の手前に追記する。

```yaml
  /categories:
    get:
      operationId: getCategories
      summary: カテゴリ一覧取得（カテゴリごとの商品件数）
      tags: [categories]
      responses:
        '200':
          description: カテゴリ一覧
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CategorySummary'
              example:
                $ref: './examples/categories.json'
```

既存の `/menu`（パラメータなし・配列レスポンス・`example` を外部 JSON 参照）と同じ形に揃えている。`operationId` は他と同じく `get` + リソース名の camelCase。

### 1-2. スキーマの追加

`components.schemas.ProductCategory` の定義の直後（`Review` の手前）に追記する。`CategorySummary` が `ProductCategory` を参照する構成にすることで、実プロジェクトでよくある「既存 enum を新しいレスポンスで再利用する」パターンを体験できる。

```yaml
    CategorySummary:
      type: object
      required: [category, productCount]
      properties:
        category:
          $ref: '#/components/schemas/ProductCategory'
        productCount:
          type: integer
          description: そのカテゴリに属する商品件数
        icon:
          type: string
          description: 一覧表示で使うアイコン名（mdi-xxx）
```

### 1-3. モックデータ（Prism 用 example）

`openapi/examples/categories.json` を新規作成する（`menu.json` / `products-list.json` と同じ置き場所）。

```json
[
  { "category": "食品", "productCount": 12, "icon": "mdi-food-apple-outline" },
  { "category": "電子機器", "productCount": 8, "icon": "mdi-laptop" },
  { "category": "ファッション", "productCount": 15, "icon": "mdi-tshirt-crew-outline" },
  { "category": "家具", "productCount": 6, "icon": "mdi-sofa-outline" },
  { "category": "スポーツ", "productCount": 9, "icon": "mdi-basketball" }
]
```

**確認方法**: この時点では yaml 単体の構文チェック手段はリポジトリに用意されていない。Step 2 で `npm run orval` がエラーなく完走すれば、`$ref` の解決も含めて yaml は妥当だったと分かる。

---

## Step 2: `npm run orval` で生成物を確認する

```bash
npm run orval
```

このリポジトリの orval 設定（`orval.config.ts`）は TS 型を `src/types/api/`（コンポーネントスキーマ単位で分割）、composable を `src/api/index.ts`、zod スキーマを `src/api/index.zod.ts` に分けて出力する2エントリ構成。`getCategories` operation から、以下が生成されるはずである。

| 生成物 | 名前 | 出力先 | 確認コマンド |
|---|---|---|---|
| TS 型（コンポーネントスキーマ） | `CategorySummary` | `src/types/api/categorySummary.ts`（`src/types/api/index.ts` から re-export） | ファイルの存在と `export interface CategorySummary` |
| フェッチ関数 | `getCategories()` → `Promise<CategorySummary[]>` | `src/api/index.ts` | `grep "export const getCategories" src/api/index.ts` |
| vue-query composable | `useGetCategories(options?)` | `src/api/index.ts` | `grep "export function useGetCategories"` |
| queryKey 関数 | `getGetCategoriesQueryKey()` → `['categories'] as const` | `src/api/index.ts` | 同上（`getGetMenuQueryKey` が `['menu']` を返すのと同じ形） |
| zod スキーマ | `GetCategoriesResponseItem`（1件分）/ `GetCategoriesResponse`（`zod.array(...)`） | `src/api/index.zod.ts` | `grep "GetCategoriesResponse" src/api/index.zod.ts` |

つまずきやすい点: **zod スキーマ名は yaml のコンポーネント名（`CategorySummary`）ではなく、operationId ベースで生成される**。`GetMenuResponseItem` / `GetMenuResponse` が `MenuItem` という名前を使っていないのと同じで、`CategorySummary` という zod スキーマは存在しない。フォールバック検証には `GetCategoriesResponse`（配列全体）または `GetCategoriesResponseItem`（1件分）を使う。

**確認方法**:

```bash
npm run type-check
```

型エラーが出ないこと。生成直後は `useGetCategories` を使うコードがまだ無いので、既存箇所の型崩れがないことだけ確認できれば十分。

---

## Step 3: 手書き composable ラッパーを作成する

`src/composables/queries/useMenu.ts` と同じ形（パラメータなしの単独取得 + ローカル JSON フォールバック）で `src/composables/queries/useCategories.ts` を作成する。

まず `src/data/categories.json`（フォールバック用、`src/data/main-menu.json` と同じ置き場所）を作る。中身は Step 1-3 の `openapi/examples/categories.json` と同一で問題ない（フォールバックは「オフライン時に表示する妥当なダミーデータ」であればよく、Prism の example と一致している必要はない）。

```typescript
// src/composables/queries/useCategories.ts
import { computed, type Ref } from 'vue'
import { useGetCategories } from '@/api'
import { GetCategoriesResponse } from '@/api/index.zod'
import type { CategorySummary } from '@/types/api'
import type { ApiError } from '@/api/apiError'
import fallbackData from '@/data/categories.json'

// ローカル JSON は信頼境界のため zod で実行時検証する
const fallback: CategorySummary[] = GetCategoriesResponse.parse(fallbackData)

/**
 * カテゴリ一覧取得。API エラー時はローカル JSON にフォールバック（オフラインモード）。
 */
export function useCategories() {
  const query = useGetCategories()

  const isFallback = computed(() => query.isError.value)
  const categories = computed<CategorySummary[]>(() =>
    isFallback.value ? fallback : (query.data.value ?? []),
  )

  return {
    categories,
    isFallback,
    isLoading: query.isLoading,
    // axios 層で全エラーが ApiError に正規化されるため、この型が実行時に正確
    error: query.error as Ref<ApiError | null>,
    refetch: query.refetch,
  }
}
```

**確認方法**: `npm run type-check` が通ること。`GetCategoriesResponse.parse(fallbackData)` はモジュール読み込み時に同期実行されるため、`categories.json` の中身が `CategorySummary[]` の形（`category` が `ProductCategory` enum の値であること等）とズレていると、この時点で `ZodError` が飛んで気づける。

---

## Step 4: ページで使う + ルーティング

### 4-1. ページコンポーネント

一覧系画面なので `MainLayout` を使う（`new-page-flow.md` の分類基準どおり）。`src/pages/CategoryListPage.vue` を作成する。

```vue
<template>
  <MainLayout title="カテゴリ一覧">
    <v-container class="py-4">
      <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <v-chip v-if="isFallback" color="warning" variant="tonal" size="small" prepend-icon="mdi-wifi-off" class="mb-4">
        オフラインモード（ローカルデータ）
      </v-chip>

      <v-row>
        <v-col v-for="c in categories" :key="c.category" cols="6">
          <v-card @click="goProducts(c.category)">
            <v-card-text class="text-center">
              <v-icon size="32" color="primary">{{ c.icon ?? 'mdi-shape-outline' }}</v-icon>
              <div class="text-body-1 font-weight-medium mt-1">{{ c.category }}</div>
              <div class="text-caption text-medium-emphasis">{{ c.productCount }}件</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </MainLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useCategories } from '@/composables/queries/useCategories'
import type { ProductCategory } from '@/types/api'

const router = useRouter()
const { categories, isFallback, isLoading } = useCategories()

function goProducts(category: ProductCategory) {
  router.push({ path: '/products', query: { category } })
}
</script>
```

### 4-2. ルーティング

ルートは `src/router/index.ts` の `routes` 配列に1行追加する（唯一のルーティング定義ファイル）。既存の新しめのページ（`StockSearchPage` 等）は遅延 import で登録されているので、それに合わせる。

```typescript
{ path: '/categories', component: () => import('@/pages/CategoryListPage.vue') },
```

`/:pathMatch(.*)*` の `ComingSoonPage` フォールバックより前であればどこに置いてもよい。

メインメニューからの導線（`src/data/main-menu.json` の `to` 差し替え）は本書のスコープ外。手順は `new-page-flow.md` の最終ステップと同じなので、必要であればそちらを参照。

**確認方法**:

```bash
npm run dev
```

ブラウザで `http://localhost:3000/#/categories` を開く（`vite.config.mts` で dev サーバーは `port: 3000`）。API サーバーが起動していないので `isFallback` が `true` になり、オフラインチップ付きで `src/data/categories.json` の5カテゴリがカードで表示されれば成功。カードをタップすると `/products?category=食品` のような URL に遷移することも確認する。

---

## Step 5: テストを書く

`src/composables/queries/__tests__/useProductDetail.test.ts` の雛形（`customAxiosInstance` を `vi.mock` し、`mount` した内部で composable を実行する）に倣って `src/composables/queries/__tests__/useCategories.test.ts` を作成する。

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { customAxiosInstance } from '@/plugins/axios'
import { ApiError } from '@/api/apiError'
import type { CategorySummary } from '@/types/api'
import { useCategories } from '../useCategories'

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

const apiCategories: CategorySummary[] = [
  { category: '食品', productCount: 99, icon: 'mdi-food-apple-outline' },
]

describe('useCategories', () => {
  beforeEach(() => {
    mockedAxios.mockReset()
  })

  it('API 成功時はレスポンスのカテゴリ一覧を返す', async () => {
    mockedAxios.mockResolvedValue(apiCategories)
    const { categories, isLoading } = mountComposable(() => useCategories())
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(categories.value).toEqual(apiCategories)
  })

  it('API エラー時はローカル JSON にフォールバックする', async () => {
    mockedAxios.mockRejectedValue(new ApiError('接続できません', undefined))
    const { categories, isFallback, isLoading } = mountComposable(() => useCategories())
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(isFallback.value).toBe(true)
    expect(categories.value.length).toBe(5) // src/data/categories.json の件数
  })
})
```

`src/test/setup.ts` がテストごとに Vuetify・Pinia・`VueQueryPlugin`（`retry: false`）を `config.global.plugins` に登録しているため、追加のセットアップは不要。

**確認方法**:

```bash
npx vitest run src/composables/queries/__tests__/useCategories.test.ts
```

2ケースとも green になること。

---

## Step 6: `npm run dev:mock` で Prism からの応答を確認する

```bash
npm run dev:mock
```

内部的には `vite`（port 3000）と `npx @stoplight/prism-cli mock openapi/api.yaml --port 4010 --cors` が並行起動する（`package.json` の `dev:mock` / `mock:prism` スクリプト）。

- Prism 単体で直接確認: ブラウザまたは `curl http://localhost:4010/categories` → Step 1-3 で作った `openapi/examples/categories.json` の内容がそのまま返る
- アプリ経由で確認: `http://localhost:3000/#/categories` を開く。`vite.config.mts` の `server.proxy` により `/api/*` → `http://localhost:4010/*`（`/api` プレフィックスは剥がされる）に転送されるため、`useGetCategories` は Prism の応答を実データとして受け取る。**オフラインチップが表示されず**、`isFallback` が `false` のままカードが表示されれば、yaml → orval → composable → 画面の配線がすべて繋がったことになる

**確認方法**: オフラインチップの有無で API 応答経由かフォールバック経由かを判別できる。両方（`npm run dev` のみ／`npm run dev:mock`）を見比べて挙動が変わることを確認するのが本演習のゴール。

---

## つまずきポイント集

- **`httpClient: 'axios'` は orval.config.ts で必須**。省略すると fetch 用のラップ型が生成され `customAxiosInstance` の型と合わなくなる（今回は設定変更不要だが、他エンドポイント追加時に config を触るなら要注意）
- **zod スキーマ名はコンポーネント名ではなく operationId ベース**。`CategorySummary` という zod export は存在せず、`GetCategoriesResponseItem` / `GetCategoriesResponse` になる。フォールバック JSON の `.parse()` で `CategorySummary`（zod）と書いてしまうミスに注意
- **TS 型は `src/api/index.ts` ではなく `src/types/api/` に分割生成される**（`orval.config.ts` の `schemas: './src/types/api'` 設定による）。ページやテストからは `@/types/api` から import する。`@/api` から型を import しようとして見つからない、というハマり方をしやすい
- **queryKey に先頭スラッシュは付かない**。`getGetCategoriesQueryKey()` は `['categories']`（`['/categories']` ではない）。手書きで queryKey を組み立てないのが大前提だが、ログ等で見た形と混同しないよう注意
- **`src/api/index.ts` / `src/api/index.zod.ts` / `src/types/api/**` は生成物なので手で編集しない**。yaml を直して `npm run orval` を再実行する
- Prism (`mock:prism`) は起動時に読み込んだ yaml をキャッシュする。`openapi/api.yaml` を編集した後に応答が変わらない場合は、`dev:mock` を一度止めて再起動する
- `example` が1つだけの場合 Prism は静的にその JSON をそのまま返す。動的なランダム生成を期待していると「常に同じデータしか返らない」で戸惑うことがあるが、これは仕様どおりの挙動
