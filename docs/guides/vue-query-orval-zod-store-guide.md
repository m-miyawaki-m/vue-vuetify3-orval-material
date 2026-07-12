# vue-query + orval + zod + Pinia 連携ガイド — 責務分離と学習順路

4つの技術がどう役割分担し、どこで連携するかを実コードに沿って解説する学習ガイド。
データ取得フローの手順詳細は [orval-zod-data-fetching-flow.md](./orval-zod-data-fetching-flow.md)、共通層の設計意図は [common-layer-architecture.md](./common-layer-architecture.md) を参照。

---

## 目次

1. [全体像：4つの技術の役割分担](#全体像4つの技術の役割分担)
2. [最重要の設計判断：データ本体ではなくキーを持ち回る](#最重要の設計判断データ本体ではなくキーを持ち回る)
3. [詳細①：取得系の3パターン](#詳細取得系の3パターン)
4. [詳細②：更新系とキャッシュ無効化](#詳細更新系とキャッシュ無効化)
5. [詳細③：Pinia は何を持つのか](#詳細pinia-は何を持つのか)
6. [守るべき規約と意図的な例外](#守るべき規約と意図的な例外)
7. [学習順路（読む順）](#学習順路読む順)

---

## 全体像：4つの技術の役割分担

背骨は「**サーバーデータは vue-query、UI 状態だけ Pinia**」という責務分離。

```
openapi/api.yaml（唯一の真実の源）
   │ npm run orval で自動生成
   ├─→ src/api/index.ts      … TS型 + useGetProducts() 等の vue-query composable
   └─→ src/api/index.zod.ts  … zod スキーマ（ランタイム検証用）

ページ → 手書き composable（src/composables/queries|mutations/）
        → 生成 composable → customAxiosInstance（src/plugins/axios.ts）→ API/Prism
                ↑ キャッシュ・再取得・ローディングは vue-query が管理

Pinia（src/stores/）… サーバーデータは持たない。UI状態・ユーザーローカルデータのみ
```

| 技術 | 責務 | このリポジトリでの実体 |
|---|---|---|
| orval | yaml から型・fetch 関数・composable・zod スキーマを生成 | `orval.config.ts` の2エントリ構成（`api` と `apiZod`） |
| vue-query | サーバーデータのキャッシュ・再取得・isLoading/isError | `src/plugins/vueQuery.ts`（staleTime 5分・retry 1・onError→Snackbar） |
| zod | 信頼境界のランタイム検証 | ローカル JSON フォールバックの `.parse()`、非同期用 `validated()` |
| Pinia | UI 状態・端末ローカルデータ（persist） | memoStore・menuStore・settingsStore 等 |

---

## 最重要の設計判断：データ本体ではなくキーを持ち回る

ページ間でデータ本体を渡さず、**キー**（id・検索条件）だけを route param / query で渡す。

- 一覧 → 詳細: `router.push(`/detail/${product.id}`)` — id のみ
- 検索 → 一覧: `router.push({ path: '/products', query: { q, category } })` — 条件のみ

同じ queryKey なら vue-query のキャッシュが即座に返すため、「一覧で取ったデータをストアに入れて詳細で使う」という持ち回りコード（と、その同期バグ）が構造的に発生しない。

---

## 詳細①：取得系の3パターン

### (a) 単純取得＋フォールバック — `src/composables/queries/useMenu.ts`

生成された `useGetMenu()` を手書き composable で包み、`isError` 時はローカル JSON に切替。

```typescript
// ローカル JSON は信頼境界のため zod で実行時検証する
const fallback: MenuItem[] = GetMenuResponse.parse(fallbackData)

export function useMenu() {
  const query = useGetMenu()
  const isFallback = computed(() => query.isError.value)
  const menuItems = computed<MenuItem[]>(() =>
    isFallback.value ? fallback : (query.data.value ?? []),
  )
  return { menuItems, isFallback, isLoading: query.isLoading, ... }
}
```

zod がここで効くのは「yaml とモックデータの乖離を開発時に即死させる」ため。`ZodError` は開発時バグとして扱い、JSON 側を yaml に合わせて直す（yaml を緩めない）。

### (b) パラメータ付き一覧 — ProductListPage

検索条件を **computed のまま** `useGetProducts(params)` に渡す。生成 queryKey に ref が入るため、route query やページ番号の変化だけで自動再フェッチされる。`placeholderData: keepPreviousData` でページ切替中の点滅を防止。

```typescript
const params = computed(() => ({ q: queryQ.value, page: currentPage.value, ... }))
const { data, isLoading, isError } = useGetProducts(params, {
  query: { placeholderData: keepPreviousData },
})
```

### (c) POST だが意味は検索 — `src/composables/queries/useStockSearch.ts`

画面固有の検索オブジェクトを POST で送るが、意味的には「取得」なので orval 生成の素の fetch 関数を手動の `useQuery` で包む。3つの技が入っている:

```typescript
const query = useQuery({
  queryKey: ['products', 'stock-search', condition],  // ← 'products' 前置（下記③）
  queryFn: ({ signal }) => searchStockProducts(unref(condition)!, undefined, signal),
  enabled: computed(() => unref(condition) !== null), // ← 検索ボタン押下まで発火しない
})
```

1. `enabled` で「条件が揃うまで待機」を宣言的に表現
2. 戻り値の契約（`searchResult` / `isLoading` / `error` / `refetch`）を他の取得系 composable と揃える
3. queryKey の 'products' 前置により、商品登録時の invalidate に検索結果も巻き込まれる（→ 詳細②）

---

## 詳細②：更新系とキャッシュ無効化

`src/composables/mutations/useRegisterProduct.ts` が更新系のお手本。

```typescript
const mutation = usePostProduct({
  mutation: {
    onSuccess: async () => {
      // ['products'] 前方一致で一覧・詳細・在庫検索のキャッシュをまとめて無効化
      await queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() })
      showSnack('success', '登録しました')
    },
  },
})
```

フロー:

```
mutation 成功 → invalidateQueries(生成キー関数)      ← 前方一致で関連キャッシュが全部 stale に
             → 表示中のクエリは自動再取得            ← ストアの手動更新は一切しない
             → 成功 Snackbar
mutation 失敗 → グローバル MutationCache がエラー Snackbar（ページ側は何もしない）
```

これが「ストアにコピーしない」方針の完成形。登録後にストアの一覧を手動更新する代わりに、**キャッシュを無効化して vue-query に取り直させる**。

エラーは axios インターセプター（`src/plugins/axios.ts` → `src/api/apiError.ts`）で `ApiError` に正規化済みのため、`error as Ref<ApiError | null>` のキャストが実行時に正確になる。

---

## 詳細③：Pinia は何を持つのか

このリポジトリのストアはすべて「**サーバーが知らないデータ**」を持つ:

| ストア | 内容 | 分類 |
|---|---|---|
| `memoStore` | 商品ごとのメモ（`Record<productId, string>`、persist） | ユーザーローカルデータ |
| `menuStore` | メニューの表示・並び順（persist） | UI 状態 |
| `settingsStore` / `themeStore` | 設定・テーマ（persist） | UI 状態 |
| `scannerStore` / `scanListStore` / `scanModeStore` | スキャナー・スキャンフローの画面状態 | UI 状態 |

**vue-query と Pinia の連携点は一点だけ**: Pinia がサーバーデータの **id をキー**として持ち、表示時にコンポーネントの computed で結合する。

```typescript
// 例: 商品カードにメモの有無を表示
const memoStore = useMemoStore()
const hasMemo = computed(() => memoStore.hasMemo(product.value.id))
```

双方向の同期コードは存在しない。サーバーデータが更新されても memoStore は id で引くだけなので影響を受けず、キャッシュが破棄されてもメモは persist で残る。

---

## 守るべき規約と意図的な例外

| 規約 | 理由 | 例外 |
|---|---|---|
| `src/api/index.ts` / `index.zod.ts` を手で編集しない | `npm run orval` で再生成されて消える | なし |
| queryKey を手書きしない（`getXxxQueryKey()` を使う） | invalidate の前方一致が崩れる | `useStockSearch` は invalidate に巻き込まれるために 'products' 前置で**意図的に手書き**（理由コメント必須） |
| サーバーデータを Pinia にコピーしない | キャッシュは vue-query が持つ。二重管理は同期バグの温床 | なし（Pinia は id 参照のみ） |
| ページ間ではデータ本体でなくキーを渡す | キャッシュヒットで持ち回り不要 | なし |

---

## 学習順路（読む順）

1. [orval-zod-data-fetching-flow.md](./orval-zod-data-fetching-flow.md) — シーケンス図・エラーフロー図つきの全体像
2. `orval.config.ts` → `src/plugins/axios.ts` → `src/api/apiError.ts` — 生成と共通層
3. `src/composables/queries/useMenu.ts` → `useStockSearch.ts` — 取得の基本と応用
4. `src/composables/mutations/useRegisterProduct.ts` — 更新と invalidate
5. `src/plugins/vueQuery.ts` ＋ `src/composables/useGlobalLoading.ts` — グローバル横断処理（Snackbar・ローディングオーバーレイ）
6. 各 composable の `__tests__/` — QueryClient を差し替えてテストするパターン
7. 概念の深掘りは [reference/vue-query-architecture.md](../reference/vue-query-architecture.md)（キャッシュ / QueryKey / 状態機械）

### テーマ別の深堀りドキュメント

- [query-key-and-cache-lifecycle.md](./query-key-and-cache-lifecycle.md) — queryKey の実形状・staleTime/invalidate の動き
- [testing-vue-query-composables.md](./testing-vue-query-composables.md) — QueryClient 差し替え・モック境界・テストパターン
- [add-endpoint-hands-on.md](./add-endpoint-hands-on.md) — 新エンドポイントを画面まで通すハンズオン演習

### 演習課題（手を動かす）

1. **キャッシュ観察**: `npm run dev:mock` で一覧 → 詳細 → 一覧と遷移し、Network タブで2回目の一覧に HTTP が飛ばない（staleTime 5分内）ことを確認する
2. **invalidate 観察**: 商品登録後に一覧・在庫検索が自動再取得されることを Network タブで確認する
3. **新エンドポイント追加**: `openapi/api.yaml` に GET を1本足して `npm run orval` → 生成された `useXxx()` をページで呼ぶ → Prism が同じ yaml から応答することを確認する（手順は [new-page-flow.md](./new-page-flow.md)）
