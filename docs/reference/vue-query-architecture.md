# Vue Query (TanStack Query) アーキテクチャ解説

---

## 目次

1. [Vue Query とは何か](#vue-query-とは何か)
2. [アーキテクチャ全体像](#アーキテクチャ全体像)
3. [コアコンセプト: QueryClient とキャッシュ](#コアコンセプト-queryclient-とキャッシュ)
4. [コアコンセプト: QueryKey](#コアコンセプト-querykey)
5. [コアコンセプト: クエリの状態機械](#コアコンセプト-クエリの状態機械)
6. [useQuery の挙動詳細](#usequery-の挙動詳細)
7. [useMutation の挙動詳細](#usemutation-の挙動詳細)
8. [このプロジェクトでの実装詳細](#このプロジェクトでの実装詳細)
9. [Pinia との役割分担](#pinia-との役割分担)
10. [よくある疑問 Q&A](#よくある疑問-qa)

---

## Vue Query とは何か

Vue Query は「**サーバー状態管理**」のライブラリ。

通常の状態管理（Pinia など）が扱うのは**クライアント状態**（UI の開閉状態、ユーザーが入力した値など）。
Vue Query が扱うのは**サーバー状態**（API から取得したデータ）。

### サーバー状態の何が難しいか

API から取得したデータには、クライアント状態にはない固有の問題がある:

| 問題 | 説明 |
|---|---|
| 非同期 | 取得完了まで待つ必要がある |
| 所有権が自分にない | サーバー側でいつでも変更される |
| 陳腐化 (stale) | 取得してしばらくすると古くなる |
| 重複リクエスト | 同じデータを複数コンポーネントが同時に要求する |
| エラーハンドリング | 失敗時のリトライ・フォールバック |
| ローディング状態 | ユーザーへのフィードバック |

これらを毎回手書きすると膨大なボイラープレートが生まれる。Vue Query はこれをすべて内包する。

### Vue Query を使わない場合（手書き）

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

// 毎回これだけの state を宣言しないといけない
const data = ref(null)
const isLoading = ref(false)
const error = ref(null)

onMounted(async () => {
  isLoading.value = true
  try {
    const res = await axios.get('/products')
    data.value = res.data
  } catch (e) {
    error.value = e
  } finally {
    isLoading.value = false
  }
})
// キャッシュなし: 毎回マウントするたびリクエスト
// 重複除去なし: 2コンポーネントが同時に呼ぶと2回リクエスト
// 再取得ロジック: 自前実装が必要
</script>
```

### Vue Query を使う場合

```vue
<script setup lang="ts">
import { useGetProducts } from '@/api/products'

// これだけ
const { data, isLoading, error } = useGetProducts()
// ✅ キャッシュ自動管理
// ✅ 重複リクエスト自動除去
// ✅ バックグラウンド再取得
// ✅ エラー・ローディング状態
</script>
```

---

## アーキテクチャ全体像

```
┌─────────────────────────────────────────────────────────────┐
│  Vue アプリケーション                                         │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │ ProductList  │   │  DetailPage  │   │ その他Page   │    │
│  │    Page      │   │              │   │              │    │
│  │              │   │              │   │              │    │
│  │ useGetProducts   useGetProductById                 │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │ すべて同じ QueryClient を参照   │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              QueryClient (グローバルシングルトン)     │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │  QueryCache (インメモリキャッシュ)            │    │    │
│  │  │                                             │    │    │
│  │  │  key: ['products', {page:1}]  → {data, ...}│    │    │
│  │  │  key: ['products', {page:2}]  → {data, ...}│    │    │
│  │  │  key: ['products', 1]         → {data, ...}│    │    │
│  │  │                                             │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                               │
└────────────────────────────┼────────────────────────────────┘
                             │ キャッシュミス時のみリクエスト
                             ▼
              ┌──────────────────────────┐
              │  customAxiosInstance     │
              │  (src/plugins/axios.ts)  │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  API サーバー / Prism     │
              │  localhost:4010          │
              └──────────────────────────┘
```

**ポイント**: コンポーネントは QueryClient のキャッシュを「購読」する。
複数コンポーネントが同じ key を `useQuery` で呼んでも、HTTP リクエストは1回だけ。

---

## コアコンセプト: QueryClient とキャッシュ

### QueryClient の初期化（src/plugins/index.ts）

```typescript
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        retry: false,            // 失敗してもリトライしない
        refetchOnWindowFocus: false, // ウィンドウにフォーカスが戻っても再取得しない
      },
    },
  },
})
```

`VueQueryPlugin` は Vue の `provide` を使って QueryClient をアプリ全体に注入する。
`useQuery` / `useMutation` は内部で `inject` して同じ QueryClient を参照する。

### キャッシュの仕組み

キャッシュは JavaScript の `Map` に近いイメージ。**key → エントリ** の対応で管理される。

```
QueryCache {
  ['products', { page: 1, pageSize: 5 }]  →  QueryEntry {
                                                 data: { items: [...], total: 50 },
                                                 status: 'success',
                                                 dataUpdatedAt: 1719000000000,  // 取得した時刻
                                                 isFetching: false,
                                                 observers: [ref1, ref2],  // 購読中のフック
                                               }
  ['products', 1]                          →  QueryEntry { data: { id:1, name:'...' }, ... }
}
```

### staleTime と gcTime

```
取得完了
    │
    │◄── fresh 期間 (staleTime: デフォルト0秒) ──►│
    │                                             │
    │         ← stale（古い）状態 →               │
    │                                             │
    │◄──────── gcTime (デフォルト5分) ────────────►│
    │                                             │
    │                                     ガベージコレクション
    │                                     (オブザーバーが0になってから)
```

| 設定 | デフォルト | 意味 |
|---|---|---|
| `staleTime` | 0ms | この時間内は「新鮮」とみなして再取得しない |
| `gcTime` | 5分 | オブザーバー（useQuery を呼ぶコンポーネント）がいなくなってからキャッシュを破棄するまでの時間 |

**デフォルト staleTime=0 の意味**: 取得直後からデータは「古い」とみなされる。
ただしリクエストは「コンポーネントマウント時」「ウィンドウフォーカス時」などのトリガーがないと飛ばない。

---

## コアコンセプト: QueryKey

QueryKey はキャッシュのキー。**同じ key = 同じキャッシュエントリ** を指す。

### このプロジェクトでの QueryKey

```typescript
// Orval が生成した関数
export const getGetProductsQueryKey = (params?: MaybeRef<GetProductsParams>) => {
  return ['products', ...(params ? [params] : [])] as const
}

// 呼び出し例
getGetProductsQueryKey()
// → ['products']

getGetProductsQueryKey({ page: 1, pageSize: 5 })
// → ['products', { page: 1, pageSize: 5 }]

getGetProductsQueryKey({ page: 1, pageSize: 5, q: '緑茶' })
// → ['products', { page: 1, pageSize: 5, q: '緑茶' }]

getGetProductByIdQueryKey(1)
// → ['products', 1]
```

### QueryKey の一致ルール

```typescript
// 完全一致
queryClient.invalidateQueries({ queryKey: ['products', { page: 1 }] })
// → ['products', { page: 1 }] だけ無効化

// 前方一致（prefixMatch）
queryClient.invalidateQueries({ queryKey: ['products'] })
// → ['products'] から始まる全エントリを無効化
//   ['products', { page: 1 }], ['products', { page: 2 }], ['products', 1] など全部
```

### なぜ配列なのか

```typescript
// NG: 文字列だと前方一致がしにくい
queryKey: 'products'

// OK: 配列にすることで階層構造を表現できる
queryKey: ['products']              // 商品全体
queryKey: ['products', { page: 1 }] // 商品一覧の1ページ目
queryKey: ['products', 42]          // id=42 の商品詳細
```

---

## コアコンセプト: クエリの状態機械

`useQuery` が返す状態は以下の状態機械に従って遷移する。

```
                    ┌─────────────┐
                    │   pending   │  ← マウント直後、キャッシュなし
                    │ (初回ロード) │
                    └──────┬──────┘
                           │ fetch 成功
              ┌────────────┼────────────┐
              │            │            │ fetch 失敗
              ▼            ▼            ▼
         ┌─────────┐  ┌─────────┐  ┌─────────┐
         │ success │  │ success │  │  error  │
         │(新鮮)   │  │(stale)  │  │         │
         └────┬────┘  └────┬────┘  └────┬────┘
              │ staleTime  │             │ retry 後も失敗
              │ 経過       │             │
              ▼            │ refetch     │
         ┌─────────┐       │ トリガー   │
         │  stale  │◄──────┘            │
         │(古い)   │                    │
         └────┬────┘                    │
              │ コンポーネントが          │
              │ useQuery を呼んだ時に    │
              │ バックグラウンド再取得   │
              ▼
         バックグラウンド fetch 中
         (isFetching=true, data は古い値のまま表示)
```

### フラグの組み合わせ

| status | fetchStatus | isLoading | isFetching | isError | 状況 |
|---|---|---|---|---|---|
| `pending` | `fetching` | `true` | `true` | `false` | 初回ロード中 |
| `success` | `idle` | `false` | `false` | `false` | 正常完了 |
| `success` | `fetching` | `false` | `true` | `false` | バックグラウンド再取得中（古いデータを表示しながら） |
| `error` | `idle` | `false` | `false` | `true` | 失敗（データなし） |
| `error` | `fetching` | `false` | `true` | `true` | 再取得中（エラー状態のまま） |

> **isLoading** は `status === 'pending' && isFetching === true` の場合だけ true。
> バックグラウンド再取得中（データあり）は `isLoading=false` のまま `isFetching=true` になる。

---

## useQuery の挙動詳細

### Orval が生成した useGetProducts の内部構造

```typescript
// src/api/products.ts（生成コード）

// ① URL 組み立て関数
export const getGetProductsUrl = (params?: GetProductsParams) => {
  const normalizedParams = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  })
  const stringifiedParams = normalizedParams.toString()
  return stringifiedParams.length > 0 ? `/products?${stringifiedParams}` : `/products`
}

// ② 実際の fetch 関数（queryFn として使われる）
export const getProducts = async (params?: GetProductsParams): Promise<getProductsResponse> => {
  return customAxiosInstance<getProductsResponse>(getGetProductsUrl(params), { method: 'GET' })
}

// ③ QueryKey 生成
export const getGetProductsQueryKey = (params?: MaybeRef<GetProductsParams>) =>
  ['products', ...(params ? [params] : [])] as const

// ④ useQuery に渡すオプションをまとめる関数
export const getGetProductsQueryOptions = (params?, options?) => {
  const queryKey = getGetProductsQueryKey(params)
  // params が MaybeRef なので unref() して実際の値にする
  const queryFn = ({ signal }) => getProducts(unref(params), { signal })
  return { queryKey, queryFn, ...options?.query }
}

// ⑤ コンポーネントから呼ぶフック（useQuery のラッパー）
export function useGetProducts(params?, options?, queryClient?) {
  const queryOptions = getGetProductsQueryOptions(params, options)
  const query = useQuery(queryOptions, queryClient)
  query.queryKey = unref(queryOptions).queryKey
  return query
}
```

### コンポーネントでの使われ方（ProductListPage.vue）

```typescript
// params は computed なので、値が変わると useQuery が自動で再フェッチする
const params = computed(() => ({
  q: queryQ.value,
  category: queryCategory.value,
  inStock: queryInStock.value || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

const { data, isLoading, isError } = useGetProducts(params)
```

**内部で何が起きているか:**

```
1. useGetProducts(params) が呼ばれる
   │
   ▼
2. getGetProductsQueryOptions(params) でオプション生成
   queryKey = ['products', params] ← computed を参照
   queryFn  = () => getProducts(unref(params))
   │
   ▼
3. useQuery({ queryKey, queryFn }) が呼ばれる
   │
   ├─ キャッシュに ['products', { page:1, ... }] があるか確認
   │   ある → data にキャッシュを即返す (stale なら裏でリフェッチ)
   │   ない → queryFn() を実行してリクエスト開始
   │
   ▼
4. params (computed) が変わったとき
   例: currentPage が 1 → 2 になると
   queryKey が ['products', {page:1,...}] → ['products', {page:2,...}] に変わる
   → Vue Query が変化を検知してリクエスト再実行
   │
   ▼
5. 新しいデータ取得完了
   data.value が更新 → テンプレートが再レンダリング
```

### AbortController による自動キャンセル

Orval が生成した `queryFn` には `signal` が渡されている:

```typescript
const queryFn = ({ signal }) => getProducts(unref(params), { signal })
```

これにより、params が変わって新しいリクエストが始まったとき、
進行中の古いリクエストは自動的にキャンセルされる（axios が `signal` を受け取って `AbortController` で中断）。

---

## useMutation の挙動詳細

POST / PUT / DELETE など副作用のある操作には `useMutation` を使う。
`useQuery` との最大の違いは**自動実行されない**こと。

```typescript
const { mutate, mutateAsync, isPending, isError, data, reset } = useMutation({
  mutationFn: (variables) => createProduct(variables),
  onSuccess: (data, variables, context) => { /* 成功後の処理 */ },
  onError:   (error, variables, context) => { /* 失敗後の処理 */ },
  onSettled: (data, error, variables)    => { /* 成否問わず実行 */ },
})

// 明示的に呼ぶ
mutate({ name: '新商品', price: 1000 })
```

### 成功後のキャッシュ無効化パターン

```typescript
import { useQueryClient } from '@tanstack/vue-query'
import { getGetProductsQueryKey } from '@/api/products'

const queryClient = useQueryClient()

const { mutate } = useCreateProduct({
  mutation: {
    onSuccess: () => {
      // 一覧キャッシュを全部無効化 → 次回 useGetProducts が自動再取得
      queryClient.invalidateQueries({
        queryKey: getGetProductsQueryKey(),  // ['products'] から始まるもの全部
      })
    },
  },
})
```

### mutate vs mutateAsync

```typescript
// mutate: コールバックでハンドリング（エラーをスローしない）
mutate(data, {
  onSuccess: (res) => { /* 成功 */ },
  onError: (err) => { /* 失敗 */ },
})

// mutateAsync: Promise を返す（try/catch で書ける）
try {
  const result = await mutateAsync(data)
  // 成功処理
} catch (err) {
  // 失敗処理
}
```

---

## このプロジェクトでの実装詳細

### データフロー全体図

```
ProductListPage.vue
│
├── params (computed)
│   ├── queryQ.value      ← route.query.q
│   ├── queryCategory.value ← route.query.category
│   ├── queryInStock.value  ← route.query.inStock
│   ├── currentPage.value   ← ref(1)
│   └── PAGE_SIZE = 5
│
├── useGetProducts(params)
│   │
│   │  [キャッシュヒット時]
│   │  QueryCache['products', {q, category, inStock, page, pageSize}]
│   │    → data.value = { data: ProductListResponse, status: 200 }
│   │
│   │  [キャッシュミス時]
│   │  customAxiosInstance('/products?q=...&page=1&pageSize=5')
│   │    → axios.get(baseURL + '/products?...')
│   │    → Prism (localhost:4010) または 本番 API
│   │
│   └── { data, isLoading, isError }
│
├── data.value?.data  → ProductListResponse（本番データ）
├── isError.value     → isFallback = true
│
└── displayData (computed)
    ├── isFallback=false → data.value.data（API レスポンス）
    └── isFallback=true  → mockFallback.value（filterProducts でフィルタ済みモック）
```

### data.value の型構造

Orval が生成するレスポンス型は axios のレスポンス全体をラップした形になっている:

```typescript
// Orval 生成の型
type getProductsResponse = {
  data: ProductListResponse  // ← 実際のレスポンスボディ
  status: 200
  headers: Headers
}

// useGetProducts の戻り値
// data は Ref<getProductsResponse | undefined>
const { data } = useGetProducts(params)

// ✅ 正しいアクセス方法
const items = data.value?.data.items       // ProductListResponse の items
const total = data.value?.data.total
const status = data.value?.status          // 200

// ❌ よくある間違い
const items = data.value?.items            // undefined になる（data.data が必要）
```

### MaybeRef を渡す意味

```typescript
// useGetProducts の引数は MaybeRef<GetProductsParams>
// = GetProductsParams | Ref<GetProductsParams>

// ① ref を渡す場合
const page = ref(1)
const { data } = useGetProducts(ref({ page: page.value }))
// NG: ref の中身が固定値なので page が変わっても再取得されない

// ② computed を渡す場合（推奨）
const params = computed(() => ({ page: currentPage.value, pageSize: 5 }))
const { data } = useGetProducts(params)
// ✅ currentPage が変わると params も変わり、自動再取得される

// 内部で unref() して値を取り出す
const queryFn = ({ signal }) => getProducts(unref(params), { signal })
//                                          ^^^^^^^^^^^^
//                   computed の場合 .value を取り出し、プレーンな値ならそのまま使う
```

### isError → フォールバックの仕組み

```typescript
const { data, isLoading, isError } = useGetProducts(params)

// API が失敗（接続エラー・4xx・5xx）すると isError = true になる
const isFallback = computed(() => isError.value)

const displayData = computed<ProductListResponse>(() =>
  isFallback.value
    ? mockFallback.value   // モックデータでフィルタした結果
    : (data.value?.data ?? mockFallback.value)  // API データ（なければモック）
)
```

このパターンにより、開発中（Prism 未起動）でも画面が壊れず動作し続ける。

---

## Pinia との役割分担

Vue Query と Pinia は**競合しない**。扱うデータの種類が異なる。

| | Vue Query | Pinia |
|---|---|---|
| 扱うデータ | サーバー由来のデータ（API レスポンス） | クライアント側のみで存在する状態 |
| 例 | 商品一覧、商品詳細 | テーマ設定、メモ、選択中の商品 |
| 永続化 | キャッシュ（メモリ、gcTime で自動破棄） | オプションで localStorage に永続化可能 |
| 同期 | サーバーと自動同期（再取得）が前提 | 手動更新が前提 |
| 初期化 | URL・コンポーネントマウントで自動 | アプリ起動時に初期化 |

### このプロジェクトでの使い分け

```
Vue Query (src/api/products.ts)
  ├── useGetProducts() → API から商品一覧
  └── useGetProductById() → API から商品詳細

Pinia (src/stores/)
  ├── useProductStore  → 選択中の商品（store.selectProduct で手動更新）
  ├── useMemoStore     → 商品ごとのメモ（localStorage に永続化）
  └── useThemeStore    → テーマ設定（localStorage に永続化）
```

---

## よくある疑問 Q&A

### Q. コンポーネントが複数あっても API は1回しか叩かない？

**A. 同じ QueryKey を使っていれば、同時リクエストは1つにまとめられる。**

```
ProductListPage → useGetProducts({ page:1 })  ┐
SomeOtherComponent → useGetProducts({ page:1 }) ┘ → HTTP リクエストは1回だけ

※ 片方がリクエスト中に別のコンポーネントが同じ key で呼んだ場合、
   2つ目は進行中のリクエストの完了を待つ（重複排除）
```

### Q. ページを行き来するたびに API が叩かれる？

**A. staleTime の設定次第。デフォルト（0ms）では毎回叩かれる可能性がある。**

```typescript
// staleTime を設定してキャッシュを活用する
const { data } = useGetProducts(params, {
  query: {
    staleTime: 60 * 1000,  // 1分間は再取得しない
  },
})
```

### Q. refetchOnWindowFocus を false にしている理由は？

`src/plugins/index.ts` でデフォルト `false` に設定している。
スマホアプリ想定のため、他のアプリから戻ってきたときに勝手にリクエストが飛ばないようにしている。
業務データを扱う場面では `true` にすると常に最新を表示できる。

### Q. invalidateQueries と refetchQueries の違いは？

```typescript
// invalidateQueries: キャッシュを「古い」とマーク
// → そのキーを購読中のコンポーネントがあれば即座にバックグラウンド再取得
// → 購読中のコンポーネントがなければ次に useQuery が呼ばれたときに再取得
queryClient.invalidateQueries({ queryKey: ['products'] })

// refetchQueries: 今すぐ再取得（購読中かどうか関係なく）
queryClient.refetchQueries({ queryKey: ['products'] })
```

通常は `invalidateQueries` を使えばよい。

### Q. enabled: false にするとどうなる？

```typescript
const { data, isLoading } = useGetProducts(params, {
  query: {
    enabled: false,  // または computed(() => someCondition.value)
  },
})
// → queryFn が実行されない（API リクエストが飛ばない）
// → isLoading = false のまま
// → data = undefined のまま
```

Orval が `getGetProductByIdQueryOptions` で id が null/undefined のとき自動的に
`enabled: computed(() => unref(id) !== null && unref(id) !== undefined)` を設定しているのはこのため。

### Q. キャッシュを手動でクリアするには？

```typescript
// 全キャッシュをクリア（ログアウト時など）
queryClient.clear()

// 特定のキーだけ削除
queryClient.removeQueries({ queryKey: ['products'] })

// データだけ上書き（楽観的更新）
queryClient.setQueryData(
  getGetProductsQueryKey({ page: 1, pageSize: 5 }),
  (old) => ({ ...old, data: { ...old.data, items: updatedItems } })
)
```
