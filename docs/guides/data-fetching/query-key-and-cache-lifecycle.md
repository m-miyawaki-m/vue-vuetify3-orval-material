# queryKey とキャッシュの寿命 — staleTime / invalidate の動きの深堀り

このプロジェクト（`@tanstack/vue-query` `^5.101.0`。`package.json` で確認）で **実際に生成・記述されている queryKey** を素材に、キャッシュがいつ新鮮で、いつ古くなり、いつ消えるか、`invalidateQueries` がどこまで波及するかを一次情報（実コード）だけで追う。

vue-query の一般論（QueryClient とは何か・状態機械・useMutation の基本など）は [`docs/reference/vue-query-architecture.md`](../../reference/vue-query-architecture.md) に既にあるので、そちらを前提とし、本書は重複させない。**この文書は「このリポジトリでは実際にどうなるか」に徹する。**

---

## 目次

1. [このプロジェクトで生成される queryKey の実形状](#1-このプロジェクトで生成される querykey-の実形状)
2. [キャッシュ寿命のタイムライン（このリポジトリの設定値で）](#2-キャッシュ寿命のタイムライン)
3. [invalidate の前方一致マッチング](#3-invalidate-の前方一致マッチング)
4. [placeholderData: keepPreviousData と enabled](#4-placeholderdata-keeppreviousdata-と-enabled)
5. [観察・デバッグ方法](#5-観察デバッグ方法)
6. [よくある落とし穴](#6-よくある落とし穴)

---

## 1. このプロジェクトで生成される queryKey の実形状

### 1.1 orval 生成コード（`src/api/index.ts`）が返す実際の配列

`src/api/index.ts` は orval v8.15.0 が `openapi/api.yaml` から自動生成したファイル（冒頭コメント `Do not edit manually.`）。3 つの `getGet*QueryKey` 関数がある。

```typescript
// src/api/index.ts:64-68
export const getGetMenuQueryKey = () => {
    return [
    'menu'
    ] as const;
    }
```

```typescript
// src/api/index.ts:136-140
export const getGetProductsQueryKey = (params?: MaybeRef<GetProductsParams>,) => {
    return [
    'products', ...(params ? [params] : [])
    ] as const;
    }
```

```typescript
// src/api/index.ts:335-339
export const getGetProductByIdQueryKey = (id: MaybeRef<number>,) => {
    return [
    'products',id
    ] as const;
    }
```

呼び出すと実際にはこうなる（すべて `'products'` 前置。**一覧キーと詳細キーで先頭要素が同じ**であることが3節の invalidate 波及の根拠になる）。

| 呼び出し | 返る配列 |
|---|---|
| `getGetMenuQueryKey()` | `['menu']` |
| `getGetProductsQueryKey()` | `['products']` |
| `getGetProductsQueryKey({ page: 1, pageSize: 5 })` | `['products', { page: 1, pageSize: 5 }]` |
| `getGetProductByIdQueryKey(1)` | `['products', 1]` |

### 1.2 ref/computed が queryKey に入るとどう反応するか（cloneDeepUnref）

`getGetProductsQueryKey` は `params` を **unref せずそのまま配列に詰める**（`...(params ? [params] : [])`）。`ProductListPage.vue` は `params` を `computed` で渡している。

```typescript
// src/pages/ProductListPage.vue:96-104
const params = computed<GetProductsParams>(() => ({
  q: queryQ.value,
  category: queryCategory.value,
  inStock: queryInStock.value || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

const { productList, isFallback, isLoading } = useProductList(params)
```

一見「computed オブジェクトそのものがキーに入って毎回変わってしまうのでは」と思えるが、そうはならない。`node_modules/@tanstack/vue-query/build/modern/useBaseQuery.js:25-30` を見ると、`useQuery` に渡すオプション全体を `computed(() => cloneDeepUnref(resolvedOptions))` として評価している。`cloneDeepUnref`（`node_modules/@tanstack/vue-query/build/modern/utils.js:40-53`）は、トップレベルの `queryKey` フィールドに対しては **中身を再帰的に unref する**（`unrefGetters = true` で呼ぶ分岐がある）。

```javascript
// node_modules/@tanstack/vue-query/build/modern/utils.js:40-53
function cloneDeepUnref(obj, unrefGetters = false) {
  return cloneDeep(obj, (val, key, level) => {
    if (level === 1 && key === "queryKey") {
      return cloneDeepUnref(val, true);
    }
    if (unrefGetters && isFunction(val)) {
      return cloneDeepUnref(val(), unrefGetters);
    }
    if (isRef(val)) {
      return cloneDeepUnref(unref(val), unrefGetters);
    }
    return void 0;
  });
}
```

つまり `queryKey: ['products', paramsComputed]` は、実際にキャッシュのキーとして使われる時点では `['products', { q: ..., page: 1, ... }]` という **プレーンな値の配列** に展開されている。しかもこの展開処理は `computed` の評価関数の中で `unref()`（= `.value` アクセス）を行うため、Vue の依存追跡に乗る。`currentPage.value` が変わる → `params` computed が再評価される → `defaultedOptions` computed も再評価される → `watch(defaultedOptions, updater)` が発火し `observer.setOptions()` に新しい queryKey が渡る、という経路で自動再フェッチが起きる。

`useStockSearch` の手書き queryKey も同じ経路を通る。

```typescript
// src/composables/queries/useStockSearch.ts:39-44
export function useStockSearch(condition: MaybeRef<StockSearchCondition | null>) {
  const query = useQuery({
    queryKey: ['products', 'stock-search', condition],
    queryFn: ({ signal }) => searchStockProducts(unref(condition)!, undefined, signal),
    enabled: computed(() => unref(condition) !== null),
  })
```

`condition` が `ref` でも `computed` でも、`queryKey` 配列内で `cloneDeepUnref` により展開されるので、`condition.value` が変われば新しいキーとして扱われる。

---

## 2. キャッシュ寿命のタイムライン

このリポジトリの `QueryClient` デフォルトは `src/plugins/vueQuery.ts` に一箇所で集約されている。

```typescript
// src/plugins/vueQuery.ts:24-30
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000, // 5分: ページまたぎの再フェッチを抑制
    retry: 1,
    refetchOnWindowFocus: false,
  },
},
```

`gcTime` は明示していないので v5 のデフォルト **5分** のまま（`useLoadingSample` だけ例外的に `gcTime: 0` を個別指定している。後述）。

```
fetch 完了
   │
   │◄────────── fresh（新鮮）: staleTime = 5分 ──────────►│
   │            この間は同じ key で再マウントしても         │
   │            queryFn は呼ばれず、キャッシュを即返す       │
   │                                                      │
   │                                              stale（陳腐化）
   │                                              ここからは「トリガー」が
   │                                              あれば裏で再フェッチ
   │
   └─ observers（購読コンポーネント）が 0 になった時点から gcTime = 5分（デフォルト）カウント開始
                │
                └─► 5分間 誰も購読しなければ QueryCache から完全に破棄（GC）
```

このリポジトリの設定でのトリガー別の挙動:

| トリガー | 発火するか | 根拠 |
|---|---|---|
| 同じ画面を再マウント（stale 前） | 再フェッチしない。キャッシュを即返す | `staleTime: 5 * 60 * 1000` |
| 同じ画面を再マウント（stale 後） | 裏で再フェッチ（画面には古いデータを表示しつつ更新） | vue-query v5 標準挙動。`vue-query-architecture.md` の状態機械参照 |
| ウィンドウ/アプリへのフォーカス復帰 | 再フェッチしない | `refetchOnWindowFocus: false`（スマホアプリで他アプリから戻った時に勝手に叩かないため） |
| 通信失敗 | 1回だけ自動リトライ | `retry: 1` |
| 全 observer が離脱してから 5分放置 | キャッシュエントリごと破棄 | `gcTime` 未指定 = v5 デフォルト 5分 |

例外: `useLoadingSample`（ローディング演出確認専用）は `gcTime: 0` を個別指定しており、observer がいなくなった瞬間にキャッシュを残さない。

```typescript
// src/composables/queries/useLoadingSample.ts:13-21
const slowQuery = useQuery({
  queryKey: ['loading-sample', 'slow-fetch'],
  queryFn: async ({ signal }) => {
    await sleep(2000)
    return getProducts(undefined, undefined, signal)
  },
  enabled: false,
  gcTime: 0,
})
```

これ以外の `src/composables/queries/*` には `staleTime` / `gcTime` の個別上書きは存在しない（`grep -rn "staleTime|gcTime" src` で確認済み）。つまり `useProductList`（一覧）・`useProductDetail`（詳細）・`useStockSearch`（在庫検索）・`useMenu` はすべてグローバルの 5分 staleTime に従う。

**具体例（`ProductListPage.vue` の 1→2 ページ遷移）**: `currentPage` が変わると `params` computed の中身が変わり `queryKey` が `['products', {..., page:1}]` から `['products', {..., page:2}]` に変化するので、これは「同じキーの再マウント」ではなく「別キーへの新規フェッチ」になる。1ページ目に戻ると、5分以内なら `['products', {..., page:1}]` のキャッシュがまだ fresh なので即座に（通信なしで）表示される。

---

## 3. invalidate の前方一致マッチング

`invalidateQueries` の呼び出し箇所はリポジトリ全体で1箇所だけ（`grep -rn "invalidateQueries" src` で確認、テストコードにも呼び出しなし）。

```typescript
// src/composables/mutations/useRegisterProduct.ts:13-25
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
```

`getGetProductsQueryKey()`（引数なし）は 1.1 節の通り `['products']` を返す。`invalidateQueries` はデフォルトで前方一致（prefix match）なので、これは `'products'` から始まる **すべての** キャッシュエントリを無効化の対象にする。1節で確認した実際のキー形状に照らすと、商品登録成功時に無効化されるのは:

| キー | 該当 composable | 無効化される理由 |
|---|---|---|
| `['products', { page, pageSize, q, ... }]` | `useProductList`（`useGetProducts` 経由） | 先頭が `'products'` |
| `['products', id]` | `useProductDetail`（`useGetProductById` 経由） | 先頭が `'products'` |
| `['products', 'stock-search', condition]` | `useStockSearch` | 先頭が `'products'` |

`useStockSearch.ts` のコメントもこの前提を明言している。

```typescript
// src/composables/queries/useStockSearch.ts:37
// - queryKey は 'products' 前置なので、商品登録時の invalidate で検索結果も再取得される
```

一方 `['menu']`（`useMenu`）は先頭要素が異なるため、商品登録による invalidate の対象には**ならない**。

> 事実確認メモ: タスクの前提には「詳細 `getProductById` のキーが `'products'` 前置かどうかは生成コードで確認」とあったが、`src/api/index.ts:335-339` の実物どおり `['products', id]` であり、**一覧と同じ `'products'` を前置している**（別名前空間ではない）。想定通りだった。

invalidate 後の実際の動き（vue-query v5 標準挙動、`vue-query-architecture.md` 記載の通り）: 該当キーを購読中のコンポーネントがあれば即座にバックグラウンド再フェッチ、購読者がいなければ「古い」マークだけが付き、次に誰かがそのキーで `useQuery` を呼んだ時に再フェッチされる。商品登録は `ProductRegisterPage`（別画面）から行われるため、一覧・詳細ページが同時にマウントされていることは通常なく、実際には「戻ってきたときに再フェッチされる」パターンになる。

---

## 4. placeholderData: keepPreviousData と enabled

`ProductListPage.vue` 自体は `useProductList` を呼ぶだけで `keepPreviousData` を直接使っていない。実装は composable 側にある。

```typescript
// src/composables/queries/useProductList.ts:1-22
import { keepPreviousData } from '@tanstack/vue-query'
import { useGetProducts } from '@/api'
...
/**
 * 商品一覧取得。params の変化で自動再フェッチ・同一条件はキャッシュから即表示。
 * ページ遷移中は前ページのデータを保持（表示の点滅を防ぐ）。
 * API エラー時はモック JSON をクライアント側でフィルタして表示（オフラインモード）。
 */
export function useProductList(params: MaybeRef<GetProductsParams>) {
  const query = useGetProducts(params, {
    query: { placeholderData: keepPreviousData },
  })
```

`page` が 1→2 に変わると `queryKey` が変わり（1.2 節）新規フェッチが始まるが、`placeholderData: keepPreviousData` により、新しいキーの `query.data` は「フェッチ完了まで前のページのデータのまま」になる（`isLoading` は false、`isFetching` が true になる状態遷移。詳細な状態機械は `vue-query-architecture.md` の「状態の組み合わせ」表を参照）。これにより `ProductListPage.vue` はページ送り時に空白／スケルトンへ点滅せず、直前の一覧を表示し続けたままフッターのページネーションだけが更新される。

`enabled` の実例は `useStockSearch` にある。

```typescript
// src/composables/queries/useStockSearch.ts:43
enabled: computed(() => unref(condition) !== null),
```

`condition` が `null`（検索ボタン未押下）の間は `queryFn` が呼ばれず、`isLoading` は `false` のまま、`searchResult` も `null` のまま維持される。オルバル生成の `useGetProductById` にも同種の自動 `enabled` があり、`DetailPage.vue` の `productId`（`computed(() => Number(props.id))`）が `NaN` にならない限り常に有効になる。

```typescript
// src/api/index.ts:357
enabled: computed(() => unref(id) !== null && unref(id) !== undefined), ...
```

---

## 5. 観察・デバッグ方法

### 5.1 テストでの QueryClient 差し替え

`src/test/setup.ts` はテストごとに新しい `QueryClient` を生成して差し替える。

```typescript
// src/test/setup.ts:25-32
beforeEach(() => {
  setActivePinia(createPinia())
  // テスト毎に新しい QueryClient（キャッシュ持ち越し防止・retry 無効で高速化）
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  config.global.plugins = [vuetify, [VueQueryPlugin, { queryClient }]]
})
```

`src/plugins/vueQuery.ts` の本番デフォルト（`staleTime: 5分`, `retry: 1`, `refetchOnWindowFocus: false`, `QueryCache.onError` で snackbar 表示）とは**別物**であることに注意。

- `staleTime` を明示していない → テストではデフォルトの **0ms**。つまりテスト内で同じキーを2回 `useQuery` すると、本番と違い基本的に毎回 fresh とはみなされない挙動になり得る（キャッシュに乗るのは同じだが「stale 前提」でテストを書いても壊れにくい）。
- `retry: false` によりエラー系テストが `retry: 1` のリトライ待ちで遅くならない。
- `QueryCache.onError`（`useSnackbar` 連携）が設定されていない。したがってテストで `error.value` の中身は直接検証できるが、エラー時の snackbar 表示はこのグローバルフックではなく `MutationCache` 側のフックや各テストのモックで別途検証する必要がある（`useRegisterProduct.test.ts` は `useSnackbar()` の `state` を直接見ている）。
- 各テストが自前の `QueryClient` を持つため、**テスト間でキャッシュが持ち越されない**。本番の「5分 fresh」による再フェッチ抑制はテストでは再現されない、という違いを意識すること。

### 5.2 開発時にキャッシュ状態を観察する現実的な手段

このリポジトリには Vue Query Devtools の導入は確認できない（`package.json` に `@tanstack/vue-query-devtools` の記載なし、`src/plugins/vueQuery.ts` にも devtools 登録なし）。したがって開発時の現実的な観察手段は次のいずれかになる。

- ブラウザ DevTools の Network タブで、同じ URL に対するリクエストが「発生したか／されなかったか」を見る（stale 前は発生しない）。
- `QueryCache` の `onError`（`src/plugins/vueQuery.ts:11-15`）が snackbar を出す仕組みを利用し、意図せぬリフェッチ失敗が起きていないかを UI 上で確認する。
- 一時的に `console.log` を `queryFn` 内、または `useQuery` の `query.dataUpdatedAt` / `query.isFetching` に仕込んで、再フェッチのタイミングを直接観察する。
- 導入するなら `VueQueryPlugin` 登録直後に `@tanstack/vue-query-devtools` を追加するのが定石だが、本リポジトリでは未導入なので追加は別タスク。

---

## 6. よくある落とし穴

### 6.1 computed を `.value` で渡すと再フェッチしない

`useGetProducts` / `useProductList` の引数は `MaybeRef<GetProductsParams>`。ここに `params.value`（プレーンオブジェクト）を渡すと、その時点のスナップショットが `queryKey` に固定化され、以後 `params` が変わっても Vue の依存追跡が働かないため再フェッチされない。`ProductListPage.vue` が `params`（computed 自体）を渡しているのはこのため（1.2 節の `cloneDeepUnref` の解説の通り、computed のまま渡すことで内部の `unref()` 呼び出しが依存追跡に乗る）。

### 6.2 queryKey 手書きの禁止と `useStockSearch` の意図的な例外

`docs/guides/data-fetching/orval-zod-data-fetching-flow.md` の方針表にある通り、`src/api/index.ts` は自動生成物であり編集禁止。同様に、一覧・詳細のような openapi 定義済みエンドポイントの queryKey は生成された `getGetProductsQueryKey` / `getGetProductByIdQueryKey` を使うべきで、手書きすべきではない（表記ゆれによる cache miss を防ぐため）。

`useStockSearch.ts` はこの原則の**意図的な例外**である。理由はコード冒頭のコメントに明記されている。

```typescript
// src/composables/queries/useStockSearch.ts:30-38
/**
 * 在庫検索（画面固有の検索オブジェクトを POST で送るパターンのお手本）。
 *
 * - 検索条件は在庫検索画面専用の StockSearchCondition（openapi.yaml で画面ごとに自由に定義）
 * - HTTP は POST だが意味的には「取得」なので、orval 生成の素の関数を useQuery で包み、
 *   他の取得系 composable と同じ契約（データ・isLoading・error・refetch）に揃える
 * - condition が null の間は検索しない（検索ボタン押下までの待機状態）
 * - queryKey は 'products' 前置なので、商品登録時の invalidate で検索結果も再取得される
 */
```

POST エンドポイントは orval が `useMutation` ベースの composable（`useSearchStockProducts`、`src/api/index.ts:306-315`）しか生成しないため、`useQuery` として使いたい場合は queryKey を手で組み立てるしかない。その際に **`'products'` を先頭に置く**という命名規約を守ることで、3節の invalidate 前方一致に自然に乗る設計になっている。新しく画面固有の POST 検索を追加する場合も、この命名規約（対象リソース名を先頭に置く）を踏襲するのが安全。

### 6.3 `getGetProductsQueryKey()` の引数省略と部分一致の粒度

`getGetProductsQueryKey()`（引数なし）と `getGetProductsQueryKey({ page: 1 })` は別のキーであり、後者を `invalidateQueries` に渡すと `['products', { page: 1 }]` に前方一致するキーだけが対象になり、`['products', { page: 2 }]` は無効化されない。`useRegisterProduct.ts` が引数なしで呼んでいるのは「ページ番号を問わず一覧・詳細・在庫検索すべてを無効化したい」という意図の表れであり、意図的な選択。他の画面で「このページの一覧だけ無効化したい」というケースがあれば、引数を渡して粒度を絞る必要がある。

### 6.4 gcTime を意識しない放置キャッシュ

`useLoadingSample` 以外は `gcTime` を個別指定していないため、画面を離れて 5分以内に戻ると（`staleTime` も 5分なので）**通信なしで**古いデータがそのまま出る。デモ用・演出用の一時的なクエリ（`useLoadingSample` のような）は `gcTime: 0` を明示しないと不要なキャッシュがメモリに残り続ける点に注意。
