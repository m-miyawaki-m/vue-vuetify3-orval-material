# テストガイド

> **📦 アーカイブ資料**: この資料は旧テスト方式のものです。現行は [guides/team-guide.md](../guides/team-guide.md) の「5. テストの書き方」を参照してください。

## 1. テスト構成の全体像

```
┌─────────────────────────────────────────────┐
│  Vitest（ユニットテスト）                     │
│  対象: .ts 純粋関数 / Pinia ストア           │
│        Vue コンポーネントの props・emit       │
│  目標: ts ファイルのカバレッジ 100%           │
├─────────────────────────────────────────────┤
│  Playwright（E2E テスト）                    │
│  対象: ページ遷移・ユーザー操作フロー全体     │
│  目標: デシジョンテーブルのシナリオ全通過     │
└─────────────────────────────────────────────┘
```

### 役割分担

| 対象 | Vitest | Playwright |
|---|---|---|
| 純粋関数（utils） | ◎ 100% 目標 | — |
| Pinia ストア | ◎ 100% 目標 | — |
| computed のロジック | ◎（ts に抽出して） | — |
| props → DOM 表示 | ○ mount で確認 | — |
| emit イベント | ○ mount で確認 | — |
| ライフサイクル・実ブラウザ挙動 | △ jsdom は不完全 | ◎ |
| ページ遷移・複数画面操作 | ✗ | ◎ |
| API 連携の実動作 | ✗ | ◎ モック込み |

---

## 2. Vue ファイルの書き方の原則

**ロジックは `.ts` に出す。Vue ファイルは薄い接着剤にする。**

### NG: ロジックを vue 内に書く

```vue
<script setup>
// computed の中に判定ロジック → mount しないとテストできない
const label = computed(() =>
  inStock.value && price.value < 1000 ? 'お買い得' : '通常'
)
</script>
```

### OK: ロジックを ts に出す

```ts
// utils/productUtils.ts → mount なしにテストできる
export function getLabel(inStock: boolean, price: number): string {
  return inStock && price < 1000 ? 'お買い得' : '通常'
}
```

```vue
<script setup>
// vue は呼び出すだけ
import { getLabel } from '@/utils/productUtils'
const label = computed(() => getLabel(inStock.value, price.value))
</script>
```

この構成にすると：
- `.ts` のテストは `mount` 不要・高速・確実
- Vue ファイルは「呼び出しが正しいか」だけ確認すればよい
- computed のロジックが Vitest で完全にカバーできる

---

## 3. テストケースの作成フロー

```
① デシジョンテーブルで条件を MECE に洗い出す
       ↓
② Vitest ユニットテストと紐づける（純粋関数・ストア）
       ↓
③ シナリオテーブルに変換する（E2E の操作手順）
       ↓
④ Playwright E2E テストに落とし込む
```

---

## 4. デシジョンテーブル

条件の組み合わせを表にして、テストケースの漏れをなくす。

### 例: buildSearchQuery のデシジョンテーブル

| ケース | keyword あり | category あり | inStock=true | 期待する query |
|--------|:-----------:|:------------:|:-----------:|----------------|
| BQ-1   | N | N | N | `{}` |
| BQ-2   | Y | N | N | `{ q }` |
| BQ-3   | N | Y | N | `{ category }` |
| BQ-4   | N | N | Y | `{ inStock: "true" }` |
| BQ-5   | Y | Y | N | `{ q, category }` |
| BQ-6   | Y | N | Y | `{ q, inStock }` |
| BQ-7   | N | Y | Y | `{ category, inStock }` |
| BQ-8   | Y | Y | Y | `{ q, category, inStock }` |
| BQ-9   | 空白のみ(N扱い) | N | N | `{}` ← 境界値 |

テストファイルにこのテーブルをコメントとして埋め込み、各 `it()` に `[BQ-N]` の ID を付与してトレーサビリティを確保する。

```ts
// テストファイル内のコメント
// | ケース | C1 | C2 | C3 | 期待 |
// | BQ-1   |  N |  N |  N | {}  |

it('[BQ-1] すべて空のとき空オブジェクトを返す', () => {
  expect(buildSearchQuery('', '', false)).toEqual({})
})
```

---

## 5. シナリオテーブル（E2E）

デシジョンテーブルのケースを画面操作のシナリオに変換する。

| シナリオ | 対応 DT ケース | 操作手順 | 期待結果 |
|---|---|---|---|
| S1 | BQ-1, FP-1 | 条件なしで検索ボタン押下 | 全件表示 |
| S2 | BQ-2, FP-2 | キーワード入力して検索 | 一致商品のみ表示 |
| S3 | BQ-3, FP-3 | カテゴリ選択して検索 | カテゴリ一致のみ表示 |
| S4 | BQ-4, FP-4 | 在庫ありスイッチONで検索 | 在庫あり商品のみ表示 |
| S5 | BQ-8, FP-8 | 全条件指定して検索 | 複合絞り込み結果 |
| S6 | FP-9 | 一致しないキーワードで検索 | 0件メッセージ表示 |
| S7 | FP-10/11 | 2ページ目に移動 | 別商品が表示される |
| S8 | — | 詳細でメモ登録 → 一覧に戻る | 「入力済み」に変わる |

---

## 6. テストファイルの構成

### ディレクトリ構造

```
src/
  utils/
    searchUtils.ts           ← テスト対象（純粋関数）
    __tests__/
      searchUtils.test.ts    ← Vitest ユニットテスト
  stores/
    memo.ts
    __tests__/
      memo.test.ts
  components/
    product/
      ProductCard.vue
      __tests__/
        ProductCard.test.ts
e2e/
  scenarios.md               ← シナリオテーブル
  fixtures.ts                ← API モックヘルパー
  search.spec.ts             ← Playwright E2E (S1-S6)
  product.spec.ts            ← Playwright E2E (S7-S8)
```

### テストファイルのヘッダー規約

各テストファイルの先頭に以下を記載する。

```ts
// ============================================================
// テスト対象: ProductCard (src/components/product/ProductCard.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: product(商品データ)
// emits: click(商品) / detail(商品)
// 依存: useMemoStore
// ------------------------------------------------------------
// テストケース一覧
//   [1] 商品名・カテゴリ・説明文が表示される
//   [2] メモなし → 「未入力」チップを表示
//   ...
// ============================================================
```

---

## 7. テスト実行コマンド

### ユニットテスト（Vitest）

| コマンド | 用途 |
|---|---|
| `npm test` | ウォッチモード（コード変更のたびに自動実行・開発中） |
| `npm run test:run` | 一発実行・verbose 出力（CI・確認用） |
| `npm run test:ui` | インタラクティブ UI をブラウザで起動（`--watch` で常駐） |
| `npm run test:coverage` | カバレッジ計測（`coverage/` に静的 HTML 生成） |
| `npm run test:coverage:open` | カバレッジ計測 + ブラウザ自動オープン |

### E2E テスト（Playwright）

| コマンド | 用途 |
|---|---|
| `npm run test:e2e` | 全シナリオ実行（`playwright-report/` に HTML 生成） |
| `npm run test:e2e:ui` | Playwright GUI モードで実行（ステップ確認用） |
| `npm run test:e2e:report` | 前回の E2E レポートをブラウザで開く |

### 一括実行

| コマンド | 用途 |
|---|---|
| `npm run test:all` | Vitest → Playwright を順番に実行 |

---

## 8. 成果物の出力

### ユニットテスト カバレッジレポート

```bash
npm run test:coverage
# → coverage/index.html が生成される
```

```bash
# ブラウザで直接開く（サーバー不要）
start coverage/index.html          # Windows
open coverage/index.html           # Mac
```

**確認できる内容**

| 画面 | 内容 |
|---|---|
| トップ (`index.html`) | ファイル一覧 × Statements / Branch / Functions / Lines の % |
| ファイルをクリック | ソースコードの行単位カバレッジ（緑=通過済み・赤=未通過） |

**カバレッジ目標値**

| 対象 | 目標 | 理由 |
|---|---|---|
| `src/utils/*.ts` | 100% | 純粋関数・ロジックの核心 |
| `src/stores/*.ts` | 100% | 状態管理の核心 |
| `src/components/*.vue` | 70% 以上 | props/emit の主要パターンをカバー |
| `src/pages/*.vue` | E2E で補完 | 画面遷移は Playwright が担う |

---

### E2E テストレポート（Playwright）

```bash
npm run test:e2e          # テスト実行（playwright-report/ を更新）
npm run test:e2e:report   # レポートをブラウザで開く（空きポートを自動選択）
```

> `playwright show-report` は軽量サーバーが必要。ポートは自動割り当て（`--port 0`）。

**確認できる内容**

| タブ | 内容 |
|---|---|
| テスト一覧 | シナリオごとの pass / fail・実行時間 |
| スクリーンショット | テスト終了時の画面キャプチャ（360×720 スマホサイズ） |
| トレース | クリック・入力・ネットワークの操作ログ（タイムライン付き） |
| 動画 | 失敗時のみ録画（`retain-on-failure`） |

**出力ファイルの場所**

```
playwright-report/          ← HTML レポート本体
test-results/
  └── [テスト名]/
        ├── test-finished-1.png   ← スクリーンショット
        └── trace.zip             ← 操作ログ（レポート内から閲覧）
```

> `coverage/` `playwright-report/` `test-results/` は `.gitignore` 対象。  
> 成果物として提出する場合は zip 圧縮するか、ブラウザ印刷で PDF 化する。
