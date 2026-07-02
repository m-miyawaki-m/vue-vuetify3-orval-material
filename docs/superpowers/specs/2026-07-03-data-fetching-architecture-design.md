# データ取得アーキテクチャ設計 — axios + orval + vue-query + zod

作成日: 2026-07-03
ステータス: 設計承認待ち

---

## 目次

1. [目的](#目的)
2. [検討過程（検証ログ）](#検討過程検証ログ)
3. [アーキテクチャ全体像](#アーキテクチャ全体像)
4. [データ配置ルール](#データ配置ルール)
5. [共通処理一覧](#共通処理一覧)
6. [orval.config.ts 変更案](#orvalconfigts-変更案)
7. [エラーハンドリング設計](#エラーハンドリング設計)
8. [テスト方針](#テスト方針)
9. [移行対象](#移行対象)
10. [スコープ外（YAGNI）](#スコープ外yagni)

---

## 目的

- 各コンポーネントは表示項目を store（または query キャッシュ）から取得する
- 読み取り操作時、取得した項目 + α を条件に DB（現状は json / yaml + Prism モック）へ検索を行う
- ページをまたぐデータは保持して再利用、単独利用ならそのまま表示に使う
- `openapi/api.yaml` を唯一の真実の源とし、orval で **型・composable・zod スキーマ**を自動生成する
- 上記を支える共通処理を最小限に定義する

---

## 検討過程（検証ログ）

### 現状分析（2026-07-03 時点）

| 項目 | 状態 |
|---|---|
| orval | v8.15、`client: 'axios'`、mutator `customAxiosInstance`（`res.data` を返す） |
| axios | baseURL 設定のみ。インターセプター無し |
| useAsync | loading / error / data を管理する手書き composable |
| @tanstack/vue-query | **インストール済みだが未使用**（v5.101.0） |
| ストア | `menu.ts` = API + JSON フォールバック / `product.ts` = モック JSON をクライアントフィルタ、と方式が混在 |
| ランタイム検証 | 無し |
| モック | Prism が同じ `api.yaml` から応答 |

### 選択肢比較: データ取得の状態管理基盤

| 案 | 評価 | 理由 |
|---|---|---|
| **A. vue-query 採用（採用）** | ◎ | キャッシュ・重複リクエスト排除・再取得・loading 管理がライブラリに吸収される。「ページをまたぐ場合は store に格納」という要件は queryKey 共有によるキャッシュがそのまま代替し、持ち回りコード自体が不要になる。orval が composable を自動生成するため手書き量はむしろ減る。インストール済み・移行対象 2〜3 ファイルで今が最安の導入タイミング |
| B. useAsync + Pinia 継続 | △ | 依存は増えないが、キャッシュ・重複排除・再取得を自前実装することになり共通処理が肥大化する |
| C. Pinia に全集約 | △ | 単独利用（ページローカル表示）でもストアを作ることになり冗長 |

**vue-query 導入難易度の検証結果**: プラグイン登録 + orval 設定 1 行変更で composable が自動生成される。`useAsync` の戻り値形状（`data / isLoading / isError`）が vue-query とほぼ互換のため、呼び出し側の書き換えは機械的。学習ポイントは queryKey の概念と Pinia との役割分担の規律のみ。総合難易度: 低〜中。

### 選択肢比較: ランタイム検証（orval + zod の相性検証）

検証結果（orval v8 ドキュメント確認済み）:

- orval は同一 input に対する複数エントリ定義で、HTTP クライアントと zod スキーマを**同時生成できる**（`client: 'zod'` + `fileExtension: '.zod.ts'` で衝突回避）。公式サポートされた王道構成
- ⚠️ ただし `runtimeValidation: true`（レスポンス自動 parse）は **angular / angular-query / fetch クライアントのみ対応**。axios + カスタム mutator 構成では自動では挟まらない
- → 対応として **手書きの `validated()` ヘルパー（約10行）** で明示的に配線する方式を採用（下記パターンA）

| 案 | 評価 |
|---|---|
| **A. `validated()` ヘルパーで明示的に parse（採用）** | ◎ シンプル。検証箇所がコード上で見える。ヘルパーは共通処理として1ファイル |
| B. mutator 内で URL→スキーマのマップを引いて自動検証 | △ マップの手動メンテが必要になり、yaml 唯一の真実の源という原則が崩れる |
| C. 検証しない（TS 型のみ） | △ 現状 DB が手書き json / yaml のためデータとスペックの乖離リスクが高く、実行時検出の価値が大きい |

### 決定事項

1. データ取得基盤: **vue-query**（orval `client: 'vue-query'` で composable を自動生成）
2. ランタイム検証: **zod スキーマを orval で自動生成 + 手書き `validated()` ヘルパーで配線**
3. 役割分担: サーバーデータ = vue-query / UI 状態 = Pinia / 単独利用 = composable 戻り値を直接表示

---

## アーキテクチャ全体像

```
openapi/api.yaml（唯一の真実の源。Prism モックもここから応答）
   │  npm run orval
   ├─→ src/api/index.ts       vue-query composable + TS 型（自動生成・編集禁止)
   └─→ src/api/index.zod.ts   zod スキーマ（自動生成・編集禁止）

手書きの共通処理（最小限）
   ├─ src/plugins/axios.ts     axios インスタンス + インターセプター
   ├─ src/plugins/vueQuery.ts  QueryClient デフォルト設定 + グローバル onError
   └─ src/api/validated.ts     zod 検証ヘルパー

利用側
   ├─ pages / components  … 生成 composable（useGetProducts 等）を直接利用
   └─ Pinia stores        … 検索条件・選択 ID などの UI 状態のみ保持
```

データフロー（例: 検索 → 一覧 → 詳細）:

1. SearchPage で検索条件を入力 → **Pinia（UI 状態）に保存**
2. ProductListPage が Pinia の条件から `params` を組み立て `useGetProducts(params)` を呼ぶ → vue-query がキャッシュ管理
3. カード選択 → **選択 id を route param（または Pinia）に置く**。商品データ本体は持ち回らない
4. DetailPage で `useGetProductById(id)` → 項目 + α の再検索。同一 queryKey なら再フェッチせずキャッシュから即表示

## データ配置ルール

| データの種類 | 置き場所 | 備考 |
|---|---|---|
| サーバー由来データ（商品一覧・詳細・メニュー） | vue-query キャッシュ | queryKey 共有でページまたぎも自動解決 |
| 検索条件・選択中 id・ページ番号などの UI 状態 | Pinia | 必要に応じ persistedstate |
| 単独利用の表示データ | composable の戻り値を直接表示 | store を作らない |
| ページまたぎの検索キー | route param 優先、複雑なら Pinia | データ本体ではなく**キー**を持ち回る |

## 共通処理一覧

| # | 共通処理 | 置き場所 | 内容 |
|---|---|---|---|
| 1 | axios インターセプター | `src/plugins/axios.ts` | request: 共通ヘッダー付与（将来の認証トークン差し込み口）/ response: エラーを `ApiError` 型に正規化 |
| 2 | zod 検証ヘルパー | `src/api/validated.ts` | `validated(schema, promise)` — 信頼境界（json/yaml 読み取り・永続化復元）で `schema.parse()`。ただしモジュールスコープの JSON フォールバック（ページ初期化時の `mockProductsData` / `fallbackData` 等）は、生成スキーマの `.parse()` を直接呼び出す。`validated()` は非同期境界（API レスポンス・永続化復元）向けの共通ヘルパー |
| 3 | QueryClient デフォルト | `src/plugins/vueQuery.ts` | staleTime / retry / refetchOnWindowFocus の全体方針を一箇所で定義 |
| 4 | グローバルエラー通知 | `src/plugins/vueQuery.ts` | QueryCache の `onError` → 既存 `useSnackbar` に接続 |
| 5 | queryKey 規約 | 規約（コードなし） | orval 生成の `getXxxQueryKey()` のみ使用。手書きキー禁止 |

`validated()` の実装イメージ:

```typescript
// src/api/validated.ts
import type { ZodType } from 'zod'

export const validated = async <T>(
  schema: ZodType<T>,
  promise: Promise<unknown>,
): Promise<T> => schema.parse(await promise)
```

## orval.config.ts 変更案

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
      target: './src/api/index.zod.ts',
      client: 'zod',
      fileExtension: '.zod.ts',
    },
  },
})
```

依存追加: `zod`（本体）。`@tanstack/vue-query` は既にインストール済み。

## エラーハンドリング設計

1. **正規化**: axios レスポンスインターセプターで HTTP エラーを `ApiError { status, message, cause }` に変換。呼び出し側は axios の内部構造を知らなくてよい
2. **通知**: QueryCache の `onError` で `useSnackbar` によるグローバル通知。画面固有のエラー表示（フォールバック UI 等）は各ページの `isError` で個別対応
3. **フォールバック**: `menu.ts` の「失敗時ローカル JSON」パターンは、生成 composable の `isError` を見て computed でローカル JSON に切り替える方式で維持（`placeholderData` は「ロード前の仮表示」でありエラー時フォールバックとは意味が異なるため不採用）
4. **zod 違反**: `validated()` が throw する `ZodError` は「yaml とデータの乖離」を意味する開発時バグとして扱い、通常のエラー通知に載せる

## テスト方針

- 生成コード（`src/api/*.ts`）はテスト対象外
- `validated()`: 正常 parse / ZodError throw のユニットテスト
- axios インターセプター: エラー正規化のユニットテスト
- ページ・ストア: テスト毎に `QueryClient` を生成して `VueQueryPlugin` を差し込む共通セットアップを `src/test/setup.ts` 近辺に追加
- E2E は既存の Prism モック + Playwright 構成を継続

## 移行対象

| ファイル | 変更内容 |
|---|---|
| `orval.config.ts` | client 変更 + zod エントリ追加 |
| `src/plugins/axios.ts` | インターセプター追加（mutator シグネチャは維持） |
| `src/plugins/vueQuery.ts` | 新規（QueryClient 設定 + プラグイン登録） |
| `src/api/validated.ts` | 新規（zod ヘルパー） |
| `src/stores/menu.ts` | 削除（利用者は MainMenuPage のみ。ページ側で生成 `useGetMenu` + エラー時ローカル JSON フォールバック） |
| `src/pages/ProductListPage.vue` | `useAsync` → 生成 `useGetProducts` へ |
| `src/stores/product.ts` | 削除（利用者は DetailPage のみ。検索条件は route query 経由のため UI 状態も不要。DetailPage は生成 `useGetProductById` へ） |
| `src/composables/useAsync.ts` | 全移行完了後に削除（段階的移行中は残置可） |

## スコープ外（YAGNI）

- 全レスポンスの自動 zod 検証（mutator への URL→スキーマ マップ）— 必要になったら再検討
- ミューテーション（POST/PUT/DELETE）の設計 — 現状 api.yaml が GET のみのため対象外。追加時は同じ生成フローに乗る
- オフラインキャッシュ永続化（vue-query persister）— Capacitor/Android で必要になった時点で検討
- 認証 — インターセプターに差し込み口だけ用意
