# チーム製造向け共通層設計 — composable 統一・共通エラー処理・store 規約

作成日: 2026-07-06
ステータス: 設計承認済み（実装計画待ち）
前提スペック: [2026-07-03-data-fetching-architecture-design.md](./2026-07-03-data-fetching-architecture-design.md)

---

## 目次

1. [目的](#目的)
2. [前提・要求](#前提要求)
3. [検討過程](#検討過程)
4. [アーキテクチャ全体像](#アーキテクチャ全体像)
5. [取得系 composable 規約](#取得系-composable-規約)
6. [更新系 composable 規約](#更新系-composable-規約)
7. [エラー処理の役割分担](#エラー処理の役割分担)
8. [store 規約](#store-規約)
9. [ESLint による import 制限](#eslint-による-import-制限)
10. [チームガイド（docs/team-guide.md）](#チームガイドdocsteam-guidemd)
11. [テスト方針](#テスト方針)
12. [変更対象一覧](#変更対象一覧)
13. [スコープ外（YAGNI）](#スコープ外yagni)

---

## 目的

5人のメンバーが別々にページを製造しても、データ取得・更新・状態管理・エラー処理の書き方が全員同じになる仕組みを作る。

- ページは「共通の `useXxx()` を呼ぶ → `data` / `error` を受け取って使う」だけにする
- エラー処理はページに書かなくても共通処理（snackbar 通知）が動く
- vue-query と Pinia store の呼び出し方をページから見て同型にする
- 規約は雛形（コピペで正しい形になる）と ESLint（逸脱したらエラー）で守らせる

## 前提・要求

| 項目 | 内容 |
|---|---|
| チーム構成 | 5人が並行してページ製造 |
| スキル前提 | vue-query / Pinia を**ほぼ知らない**前提。キャッシュ・queryKey・staleTime の概念を知らなくても書ける厚めの共通層にする |
| スコープ | 取得系（useQuery）＋更新系（useMutation）両方。openapi.yaml に `POST /products` を追加してお手本を作る |
| store | 呼び出し側 API もページから見て統一（composable と同型の `useXxx()`） |
| 規約の強制 | 雛形＋コピペガイドが本体、ESLint（`no-restricted-imports`）が保険 |

## 検討過程

### 選択肢比較: 共通層のアーキテクチャ

| 案 | 評価 | 理由 |
|---|---|---|
| **A. ドメイン composable 層（採用）** | ◎ | 1エンドポイント = 1ファイルで orval フックを手書きラップ。各ファイルが具体的で初心者が読める・デバッグできる。フォールバック・zod 検証・整形の置き場が明確。orval 再生成の影響が composable 層で止まる。欠点はエンドポイント追加ごとに1ファイル手書きだが、雛形コピペで数分の作業 |
| B. 汎用ファクトリ層（createAppQuery 等） | △ | 統一度は上がるが、orval がすでに同役割のコードを生成しているため二重抽象。型パズルが発生しやすく、初心者がエラーメッセージを読めなくなる |
| C. ラップなし・規約ドキュメントのみ | △ | コード追加ゼロだが「ほぼ知らない前提」と矛盾。個別ロジックがページに散らばり書き方のブレを止められない |

### 選択肢比較: 規約の守らせ方

| 案 | 評価 | 理由 |
|---|---|---|
| **雛形＋コピペガイド（本体・採用）** | ◎ | 「正しい書き方はこれ」を教える。人はドキュメントより隣のコードをコピーする。スキル前提から必須 |
| **ESLint import 制限（保険・採用）** | ◎ | 間違った import をした瞬間にエラー。レビュー不要で逸脱を防ぐ。コストは設定10行程度。命名規則等まで縛る凝った運用はメンテコストが上がるためやらない |
| CLAUDE.md への規約記載のみ | △ | AI 利用時のみ有効。機械的強制がなく3週間で書き方が割れる |

## アーキテクチャ全体像

```
src/
  api/                  ← orval 自動生成: フック実体（手編集禁止・ページから import 禁止）
  types/
    api/                ← orval 自動生成: 型定義（output.schemas で生成先を分離。手編集禁止）
    *.ts                ← 手書き型（画面ローカルの型など）
  plugins/
    axios.ts            ← ApiError 正規化（既存のまま）
    vueQuery.ts         ← QueryCache onError（既存）＋ MutationCache onError（追加）
  composables/
    queries/            ← 取得系。1エンドポイント = 1ファイル（useProductList.ts 等）
    mutations/          ← 更新系。1操作 = 1ファイル（useRegisterProduct.ts 等）
  stores/               ← クライアント状態のみ（サーバーデータ禁止）
  pages/ components/    ← import してよいのは composables / stores の useXxx() と @/types の型だけ
```

ページ製造メンバーに伝えるルールは2行:

> **処理は `@/composables/**`・`@/stores/**` の `useXxx()`、型は `@/types/**` から。**
> **`@/api`・`@tanstack/vue-query`・`axios` を直接 import したら ESLint エラー。**

## 取得系 composable 規約

全取得系 composable は**必ず同じ4点セット**を返す（データ名だけドメインに合わせる）:

```typescript
// src/composables/queries/useProductDetail.ts
import { computed, type MaybeRef } from 'vue'
import { useGetProductById } from '@/api'

export function useProductDetail(id: MaybeRef<number>) {
  const query = useGetProductById(id) // orval 生成フック
  const product = computed(() => query.data.value ?? null)
  return {
    product,                  // データ。null 許容 computed。名前はドメイン名
    isLoading: query.isLoading,
    error: query.error,       // ApiError | null（axios 層で正規化済み）
    refetch: query.refetch,
  }
}
```

ページ側は常に1パターン:

```typescript
const { product, isLoading, error } = useProductDetail(productId)
```

- `keepPreviousData`・モック JSON フォールバック・zod 検証などの個別ロジックは composable 内に隠す。現在 ProductListPage / DetailPage にインラインで書かれているものを移設する
- 引数は `MaybeRef` で受け、リアクティブな再フェッチに対応する
- queryKey は orval 生成の `getXxxQueryKey()` のみ使用（前提スペックの規約を継続）
- **型は `@/types/api` から import する**。orval の `output.schemas` オプションで型定義の生成先を `src/types/api/` に分離し、ページ・コンポーネントは型をそこから import する（既存の `src/types/` 慣習と統一。ページは `@/api` を型 import 含め一切参照しない）

移設対象の初期セット: `useMenu`（MainMenuPage）、`useProductList`（ProductListPage、keepPreviousData 込み）、`useProductDetail`（DetailPage、モックフォールバック込み）。

## 更新系 composable 規約

openapi.yaml に `POST /products`（商品登録）を追加して orval 再生成し、お手本を1本作る。全更新系はこの形:

```typescript
// src/composables/mutations/useRegisterProduct.ts
export function useRegisterProduct() {
  // 内部: orval 生成の useMutation フック
  // 成功時: 関連キャッシュ（'products' 系 queryKey）を自動 invalidate ＋ 成功 snackbar
  return {
    submit,        // (payload, { onSuccess? }) => void
    isSubmitting,  // Ref<boolean>。ボタンの :loading にそのまま渡す
    error,         // Ref<ApiError | null>
  }
}
```

ページ側:

```typescript
const { submit, isSubmitting } = useRegisterProduct()
const onSave = () => submit(form.value, { onSuccess: () => router.back() })
```

- 成功 snackbar・失敗 snackbar・キャッシュ invalidate は composable / グローバル層が担当。ページは「成功したら画面をどうするか」だけ `onSuccess` に書く
- ページは try/catch を書かない

## エラー処理の役割分担

3段構え。ページ側は「何もしなければ共通処理、こだわりたければ `error` を見る」オプトイン方式。

| 層 | 担当 | 状態 |
|---|---|---|
| axios インターセプタ | 全エラーを `ApiError`（message / status）に正規化 | 既存のまま |
| グローバル（`QueryCache.onError` / `MutationCache.onError`） | snackbar 通知。取得系は汎用メッセージ、更新系はサーバーの `message` を表示 | QueryCache は既存。**MutationCache を `src/plugins/vueQuery.ts` に追加** |
| ページ | `error` ref を見て画面固有の対応（フォールバック表示・リトライボタン等）をしたい場合だけ使う | composable 経由で受信 |

## store 規約

### データ置き場の判断ルール（明文化して team-guide に記載）

| データの種類 | 置き場所 |
|---|---|
| サーバーから取ってくるデータ | `composables/queries`（vue-query キャッシュ） |
| 画面をまたいで持ちたいクライアント状態（設定・入力途中・端末状態） | Pinia store |
| 1画面で完結する状態 | ページ内 `ref` |

### 書き方の統一

- setup store 形式（`defineStore('xxx', () => {...})`）
- 永続化は `persist: true`（pinia-plugin-persistedstate）に統一。手書き localStorage 禁止
- ファイル名は `xxxStore.ts`、エクスポートは `useXxxStore`
- ページから見ると composable も store も「`useXxx()` を呼ぶと ref と関数が返る」で同型になる

### 既存の不統一の是正（本設計に含む）

| ファイル | 是正内容 |
|---|---|
| `src/stores/settings.ts` | 手書き localStorage → `persist: true` に移行。`settingsStore.ts` にリネーム |
| `src/stores/memo.ts` / `theme.ts` | `memoStore.ts` / `themeStore.ts` にリネーム（内容は変更なし） |

## ESLint による import 制限

`eslint.config.js` に `no-restricted-imports` の override を追加（10行程度）:

- 対象: `src/pages/**`・`src/components/**`
- 禁止 import: `@/api`（配下含む）・`@tanstack/vue-query`・`axios`・`@/plugins/axios`
- エラーメッセージで「`@/composables` の useXxx() を使ってください」と誘導
- `src/composables/**` は制限なし（ここが唯一 orval に触ってよい場所）

## チームガイド（docs/team-guide.md）

5人が読む唯一の入口として新設。内容:

1. **新しい API を使いたい** — queries / mutations の雛形コード（コピペ用・TODO コメント付き）と手順（openapi.yaml 追記 → `npm run orval` → composable 作成）
2. **ページでデータを使いたい** — 取得系・更新系それぞれの呼び出しパターン集（loading 表示・エラー個別対応・登録ボタンの実装例）
3. **状態を持ちたい** — store かページ内 `ref` かの判断フローと store 雛形
4. **お手本実装へのリンク** — ProductListPage（一覧＋検索）、DetailPage（詳細＋登録）

## テスト方針

- composable 層のテスト雛形を1本用意: テスト用 QueryClient をラップする既存パターン（`src/plugins/__tests__/vueQuery.test.ts` 参照）を流用し、`useProductDetail` のテストをお手本として作成
- ページテストは既存 SearchPage.test.ts パターンを踏襲。composable は関数1個なので `vi.mock` でモックするパターンを team-guide に記載
- ESLint ルールは既存ファイルが全て通ることを確認（違反が残る場合は移設と同時に解消）

## 変更対象一覧

| ファイル | 変更内容 |
|---|---|
| `openapi/api.yaml` | `POST /products` 追加 |
| `orval.config.ts` | `output.schemas: './src/types/api'` 追加（型生成先の分離） |
| `src/api/*` / `src/types/api/*`（再生成） | `npm run orval` で useMutation フック生成＋型を `src/types/api/` へ |
| `src/types/product.ts` | 削除（orval 生成 `Product` 型の手書き重複。利用箇所 ProductCard / ProductDialog 等は `@/types/api` に切り替え） |
| `src/composables/queries/useMenu.ts` ほか | 新規（取得系3本の移設） |
| `src/composables/mutations/useRegisterProduct.ts` | 新規（更新系お手本） |
| `src/plugins/vueQuery.ts` | MutationCache onError 追加 |
| `src/pages/MainMenuPage.vue` / `ProductListPage.vue` / `DetailPage.vue` | composable 経由に書き換え（インラインロジック移設） |
| `src/stores/settings.ts` → `settingsStore.ts` | persist 移行＋リネーム |
| `src/stores/memo.ts` → `memoStore.ts`、`theme.ts` → `themeStore.ts` | リネーム |
| `eslint.config.js` | no-restricted-imports override 追加 |
| `docs/team-guide.md` | 新規 |
| `src/composables/queries/__tests__/useProductDetail.test.ts` | 新規（テスト雛形） |

## スコープ外（YAGNI）

- 汎用ファクトリ（createAppQuery 等）— 二重抽象になるため作らない
- ESLint による命名規則・ファイル構成の強制 — メンテコストに見合わない
- 楽観的更新（optimistic update）— 必要になった画面で個別に設計
- CLAUDE.md への規約転記 — team-guide.md に一本化（必要になれば参照リンクのみ追加）
- 認証・オフライン永続化 — 前提スペックのスコープ外を継続
