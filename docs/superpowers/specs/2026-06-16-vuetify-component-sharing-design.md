# 設計ドキュメント：Vuetify コンポーネント共通化資料

**日付:** 2026-06-16  
**対象:** Vue/Vuetify 入門者〜中級者、チーム規約共有  
**構成アプローチ:** 問題提起 → 解決策型

---

## 目的

Vuetify 3 プロジェクトにおけるコンポーネント共通化の意義・手法・判断基準を、
このプロジェクト（vue-vuetify3-orval-material）の実コードを例に解説する資料を作成する。

---

## 成果物

| ファイル | 用途 |
|---|---|
| `docs/component-sharing/slides.html` | HTMLスライド（ブラウザで開いて発表・勉強会用） |
| `docs/component-sharing/README.md` | Markdownドキュメント（開発中の参照・新メンバー向け） |

両ファイルは同じ内容を異なる形式で提供する。コードは実プロジェクトのファイルから引用する。

---

## スライド構成

### 第1章：タイトル

- テーマ：「Vuetify でのコンポーネント共通化」
- サブ：「なぜ共通化するか・どこまで共通化するか」
- 対象読者・ゴールを明示

### 第2章：共通化しないと何が起きるか（問題提起）

**伝えたいこと:** 共通化しない場合の「痛み」を実感させる。

**内容:**
- Before 例：各ページに `v-app-bar` + `v-bottom-navigation` を直接書いた場合の**仮想コードスニペット**（このプロジェクトでは既に共通化済みのため、説明用に作成する）
- 問題点を3点で列挙：
  1. **重複コード** — 全ページに同じマークアップが散在する
  2. **修正コスト** — タイトルデザインを変えると全ページ修正が必要
  3. **不整合リスク** — 一部ページだけ修正漏れが発生しやすい

### 第3章：レイアウト共通化 — MainLayout / SubLayout

**伝えたいこと:** レイアウトコンポーネントの仕組みとメリット。

**内容:**
- After 例：`MainLayout.vue` / `SubLayout.vue` の実コード（`src/components/layout/`）
- 仕組みの解説：
  - `props`（`title`）でタイトルを外から渡す
  - デフォルト `<slot>` でページ本体コンテンツを差し込む
  - 名前付き `<slot name="actions">` でAppBarボタンをカスタマイズ
- 構成図（テキストベース）：
  ```
  MainLayout
  ├── v-app-bar（title prop）
  │   └── slot[actions]（オプション）
  ├── v-main
  │   └── slot（ページコンテンツ）
  └── v-bottom-navigation（tabs定義）
  ```
- `MainLayout`（タブナビ付き）vs `SubLayout`（戻るボタン付き）の使い分け表

### 第4章：UIコンポーネント共通化 — ProductCard / BaseDialog

**伝えたいこと:** レイアウト以外のUIも共通化できる。

**内容:**
- `ProductCard.vue`：商品カードの表示ロジックを1箇所に集約
  - props でデータを受け取り、emit でイベントを通知
- `BaseDialog.vue` / `ConfirmDialog.vue`：ダイアログの共通基盤
  - `BaseDialog` が枠を担い、`ConfirmDialog` がそれを拡張する継承パターン
- Before/After：共通化前は各ページに `v-dialog` + `v-card` が散在していた想定コードと比較

### 第5章：共通化の判断基準

**伝えたいこと:** 「いつ共通化するか」の明確な基準を持つ。

**3つのルール:**

| ルール | 説明 | 例 |
|---|---|---|
| 3回ルール | 同じ構造が3箇所以上に現れたら共通化を検討 | AppBar が全ページに登場 → MainLayout |
| 見た目の統一 | 同じ見た目を複数箇所で使う → レイアウト/UIコンポーネント化 | 商品カードのデザイン → ProductCard |
| ロジック分離 | 表示 + ロジックが混在する → Composable との分業を検討 | フィルター処理は useProductFilter に分離 |

**共通化しすぎの罠:**
- 汎用化しすぎて props が増え、コンポーネント内部が複雑になる
- 「似ているだけ」の要素を無理に共通化すると、差分対応で条件分岐だらけになる
- 判断基準：共通化後に「読みやすくなるか」で判断する

### 第6章：まとめ

- 共通化の3つのメリット：保守性・一貫性・開発速度
- このプロジェクトの構成まとめ（レイアウト / UIコンポーネント / Composable の3層）
- チームへの適用方針：「新規ページ作成時は必ず MainLayout か SubLayout を選ぶ」

---

## 技術選定

### スライド（slides.html）

- **Reveal.js** を CDN から読み込むシングル HTML ファイル
- 外部依存なし（ファイル単体でブラウザから開ける）
- コードハイライトは Reveal.js 内蔵の `highlight.js` を使用
- スタイル：Vuetify のブランドカラー（`#1867C0`）をアクセントに使用

### Markdownドキュメント（README.md）

- GitHub / VSCode プレビューで読める標準 Markdown
- コードブロックはシンタックスハイライト付き
- スライドと同じ章立て・同じコード例を使用

---

## スコープ外

- Vuex / Pinia などの状態管理の共通化（別トピック）
- Composable の詳細設計（第5章で触れる程度）
- テストの書き方

---

## 実装ファイル一覧（参照元）

| 参照ファイル | 使用箇所 |
|---|---|
| `src/components/layout/MainLayout.vue` | 第3章メイン例 |
| `src/components/layout/SubLayout.vue` | 第3章使い分け例 |
| `src/pages/HomePage.vue` | 第3章 After 例 |
| `src/pages/DetailPage.vue` | 第3章 SubLayout 使用例 |
| `src/components/product/ProductCard.vue` | 第4章メイン例 |
| `src/components/dialog/BaseDialog.vue` | 第4章継承パターン例 |
| `src/components/dialog/ConfirmDialog.vue` | 第4章継承パターン例 |
