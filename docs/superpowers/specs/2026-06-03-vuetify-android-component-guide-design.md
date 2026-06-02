# Vuetify 3 Android向け画面設計ガイド — 設計仕様

**作成日:** 2026-06-03  
**対象:** 自分用参照ドキュメント（チートシート）  
**用途:** Vuetify 3 + Capacitor（Android）でモバイル画面を作るときの思考プロセスと実装パターンの記録

---

## 目的

このガイドは以下の2つの問いに答える成果物を定義する。

1. **Vuetifyで画面を作るときどう考えるか** — レイアウト構造の選び方、Android UIとしての適合性判断
2. **コンポーネントをどう作るか** — このプロジェクトの実コードをベースにしたパターン集

---

## 成果物の構成

### セクション1: Vuetify画面設計の思考フロー

**内容:**
- 画面を作り始めるときの考える順番（5ステップ）
  1. レイアウト骨格を決める（v-layout / v-main / v-container）
  2. ナビゲーション方式を決める（AppBar / BottomNavigation / Drawer）
  3. コンテンツ構造を決める（v-card / v-list / v-tabs）
  4. インタラクションを決める（Dialog / Expansion / Snackbar）
  5. フィードバックを決める（Alert / Chip / Badge）
- Android（Capacitor）特有の制約
  - タッチターゲットは最低48dp相当（Vuetifyデフォルトで概ね満たす）
  - スクロール方向の競合（v-main が縦スクロール基準）
  - ステータスバー・ノッチへの対応（safe-area-inset）

**アプローチ:** 箇条書き + 1コードスニペット（骨格テンプレート）

---

### セクション2: Vuetifyコンポーネント × Android適合度表

**内容:**
コンポーネントをカテゴリ別に分類し、Androidアプリとしての適合度を4段階で評価する。

| 記号 | 意味 |
|------|------|
| ◎ | そのまま使える、Androidネイティブに近い挙動 |
| ○ | 使えるが設定が必要 |
| △ | 使えるが注意点あり（パフォーマンス・UX） |
| × | モバイルには不向き、代替を検討 |

**カテゴリ:**
- レイアウト系（v-layout, v-container, v-row, v-col）
- ナビゲーション系（v-app-bar, v-bottom-navigation, v-navigation-drawer）
- コンテンツ系（v-card, v-list, v-list-item, v-chip）
- 入力系（v-text-field, v-select, v-radio-group, v-switch, v-checkbox）
- フィードバック系（v-dialog, v-snackbar, v-alert, v-progress-circular）
- データ表示系（v-data-table, v-pagination, v-expansion-panels, v-tabs）

**アプローチ:** Markdownテーブル + 各△/×に短い補足コメント

---

### セクション3: メニュー画面パターン

**参照コード:** `src/pages/MenuPage.vue`

**内容:**
- **なぜこの構成か:** グリッドカードはAndroidのランチャー的UXに近い。`v-row` + `v-col`のレスポンシブグリッドでスマホ1列・タブレット2〜3列を自動対応。
- **実装コード:** MenuPage.vue の核心部分（v-card + v-card-title/text/actions）
- **Android注意点:** カードタップ領域の確保、`@click`イベントとdisabled状態の組み合わせ

---

### セクション4: 検索・一覧画面パターン

**参照コード:** `src/pages/SearchPage.vue`, `src/components/product/ProductCard.vue`

**内容:**
- **なぜこの構成か:** キーワード検索 + 詳細フィルター（v-expansion-panels）はAndroidの「絞り込み」UXパターンに合致。フィルターを畳めるため画面スペースを節約。
- **実装コード:**
  - 検索フィールド（v-text-field + clearable）
  - アコーディオンフィルター（v-expansion-panels + v-radio-group + v-switch）
  - 一覧 + 空状態（v-alert type="info"）
  - ページネーション（v-pagination）
- **Android注意点:** v-paginationはタップ領域が小さめ。スクロールによる無限ロードへの置き換えも検討。

---

### セクション5: 詳細画面パターン

**参照コード:** `src/pages/DetailPage.vue`

**内容:**
- **なぜこの構成か:** v-tabs + v-window はAndroidのタブ切り替えと同じUXモデル。コンテンツ量が多い詳細画面をカテゴリ別に整理できる。
- **実装コード:**
  - タブ（v-tabs + v-tab + v-window + v-window-item）
  - 商品情報カード（v-card with v-card-actions固定ボタン）
  - レビューアコーディオン（v-expansion-panels + v-rating）
  - 関連商品（ProductCardの再利用）
- **Android注意点:** v-tabsのスワイプ対応（touch-less時は手動でtab切り替え）

---

### セクション6: 共通コンポーネントの作り方

**参照コード:** `src/components/` 以下全体

**内容:**

#### 6-1: AppHeader（ナビゲーションバー）
- **設計方針:** v-app-bar を薄くラップ。propsはtitleとshowBackのみ。back遷移ロジックを内包することで呼び出し元をシンプルに保つ。
- **コード:** AppHeader.vue 全体

#### 6-2: ProductCard（再利用カードコンポーネント）
- **設計方針:** 表示データはpropsで受け取り、アクションはemitsで親に委譲。カード内部のUIロジックをゼロにする。
- **コード:** ProductCard.vue 全体

#### 6-3: ProductDialog（モーダル）
- **設計方針:** `defineModel<boolean>()` でv-model対応。表示データはpropsで受け取り。詳細遷移アクションはemitで委譲。
- **コード:** ProductDialog.vue 全体

#### 共通設計ルール
- コンポーネントは「表示」か「アクション委譲」のどちらかに責務を絞る
- Pinia storeへの直接アクセスはPage層のみ。コンポーネントはprops/emitsのみ。
- `defineProps<T>()` + `defineEmits<{...}>()` で型安全を確保

---

## 成果物の出力先

`docs/vuetify-android-guide.md`

---

## 制約・スコープ外

- Capacitorネイティブプラグイン（Camera、GPS等）は対象外
- Vuetify 3以外のUIフレームワークとの比較は対象外
- CI/CD、ビルド設定は対象外
