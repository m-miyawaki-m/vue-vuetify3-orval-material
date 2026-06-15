# 設計ドキュメント：Vuetify フロントエンド共通化資料（3分冊）

**日付:** 2026-06-16
**対象:** Vue/Vuetify 入門者〜中級者、チーム規約共有
**構成アプローチ:** 問題提起 → 解決策型

---

## 分冊構成の理由

当初の「コンポーネント共通化」から、スタイル・通信・状態管理へとスコープが拡大した。
1本に詰め込むと読者が何を持ち帰るべきか散漫になるため、**関心領域ごとに3冊に分割**する。
各冊は独立して読めるが、Vol.1 が基礎として先行する。

---

## 3冊の概要

| | タイトル | 主な読者 | 勉強会時間の目安 |
|---|---|---|---|
| **Vol.1** | コンポーネント・レイアウト共通化 | 全員（入門〜中級） | 45〜60分 |
| **Vol.2** | スタイル共通化（Vuetify テーマ） | UI担当・全員 | 30分 |
| **Vol.3** | データ・通信・Store 設計 | 実装担当・中級以上 | 45分 |

---

## 成果物（各冊2ファイルずつ）

| 冊 | スライド | Markdown |
|---|---|---|
| Vol.1 | `docs/component-sharing/vol1-components/slides.html` | `vol1-components/README.md` |
| Vol.2 | `docs/component-sharing/vol2-theming/slides.html` | `vol2-theming/README.md` |
| Vol.3 | `docs/component-sharing/vol3-data/slides.html` | `vol3-data/README.md` |

スライドは Reveal.js CDN を使ったシングル HTML（ファイル単体でブラウザから開ける）。
Markdown は GitHub / VSCode プレビューで読める標準形式。

---

## Vol.1：コンポーネント・レイアウト共通化

### 章立て（全7章）

#### 第1章：タイトル
- テーマ：「Vuetify でのコンポーネント共通化」
- 対象読者・この冊で学ぶことを明示

#### 第2章：共通化しないと何が起きるか（問題提起）

**伝えたいこと:** 共通化しない場合の痛みを実感させる。

- Before 例：各ページに `v-app-bar` + `v-bottom-navigation` を直書きした**仮想コードスニペット**
- 問題点3点：
  1. **重複コード** — 同じマークアップが全ページに散在
  2. **修正コスト** — デザイン変更が全ページ修正になる
  3. **不整合リスク** — 修正漏れが発生しやすい

#### 第3章：レイアウト共通化 — MainLayout / SubLayout

**伝えたいこと:** レイアウトコンポーネントの仕組みとメリット。

- After 例：`MainLayout.vue` / `SubLayout.vue` の実コード
- 仕組みの解説：
  - `props`（`title`）でタイトルを外から渡す
  - デフォルト `<slot>` でページ本体を差し込む
  - 名前付き `<slot name="actions">` で AppBar ボタンをカスタマイズ
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

#### 第4章：props / emit / defineModel / slot の使い方

**伝えたいこと:** 共通コンポーネントを「使う側」が知っておくべき4つの仕組み。

**① props — 親 → 子へデータを渡す**

```ts
// 子コンポーネント（ProductCard.vue）
defineProps<{ product: Product }>()

// 親テンプレート
<ProductCard :product="item" />
```

- 必須 props と省略可能 props（`withDefaults`）の違い
- `withDefaults` の使い方（`BaseDialog.vue` の `maxWidth` が実例）：
  ```ts
  withDefaults(defineProps<{
    title: string
    maxWidth?: string   // 省略可能
  }>(), {
    maxWidth: '500px'   // デフォルト値
  })
  ```

**② emit — 子 → 親へイベントを通知**

```ts
// 子コンポーネント（ProductCard.vue）
const emit = defineEmits<{
  click:  [product: Product]
  detail: [product: Product]
}>()

// 使用例
emit('detail', product)

// 親テンプレート
<ProductCard @detail="goDetail" />
```

- `@click.stop` でイベントの伝搬を止める実例（ProductCard 内の詳細ボタン）

**③ defineModel — v-model で双方向バインディング**

```ts
// 子コンポーネント（BaseDialog.vue）
const model = defineModel<boolean>()
// template で v-model="model" として使う

// 親テンプレート
<BaseDialog v-model="dialogOpen" title="タイトル" />
// dialogOpen が true/false で開閉が連動する
```

- `defineModel` = `props` + `emit` を1行で書く糖衣構文
- ダイアログの開閉など「親が状態を持ち、子が操作する」パターンに最適

**④ slot — 親からコンテンツを差し込む**

```html
<!-- 子（BaseDialog.vue）デフォルトslot + 名前付きslot -->
<v-card-text>
  <slot />                          <!-- デフォルト -->
</v-card-text>
<v-card-actions v-if="$slots.actions">
  <slot name="actions" />           <!-- 名前付き（省略可能） -->
</v-card-actions>

<!-- 親（ConfirmDialog.vue）からの使い方 -->
<BaseDialog v-model="model" :title="title">
  <p>{{ message }}</p>              <!-- デフォルトslotへ -->
  <template #actions>               <!-- 名前付きslotへ -->
    <v-btn @click="$emit('cancel')">キャンセル</v-btn>
    <v-btn color="primary" @click="$emit('confirm')">OK</v-btn>
  </template>
</BaseDialog>
```

- `$slots.actions` で「slotが渡されたか」を確認できる（BaseDialog の実例）

#### 第5章：UIコンポーネント共通化 — ProductCard / BaseDialog / ConfirmDialog

**伝えたいこと:** レイアウト以外のUIも共通化できる。継承パターンの実例。

- `ProductCard.vue`：データ表示を1箇所に集約（props でデータ受け取り・emit でイベント通知）
- `BaseDialog.vue` → `ConfirmDialog.vue`：**継承パターン**
  - `BaseDialog` が枠（タイトル・幅・slot）を担う
  - `ConfirmDialog` が `BaseDialog` を使い、OK/キャンセルを追加する
  - 継承のメリット：枠のデザインを変えるときは `BaseDialog` だけ修正すればよい
- `SearchPage.vue` での実際の呼び出しフロー：
  1. `ProductCard` の `@click` → `openDialog(product)`
  2. `store.selectProduct(product)` で Store に選択商品を保存
  3. `<ProductDialog v-model="dialogOpen">` が開く

#### 第6章：共通化の判断基準

| ルール | 説明 | 例 |
|---|---|---|
| 3回ルール | 同じ構造が3箇所以上 → 共通化を検討 | AppBar が全ページ → MainLayout |
| 見た目の統一 | 同じ見た目を複数箇所で使う | 商品カード → ProductCard |
| ロジック分離 | 表示 + ロジックが混在 → Composable と分業 | フィルター → useProductFilter |

**共通化しすぎの罠:**
- props が増えすぎて内部が条件分岐だらけになる
- 「似ているだけ」の要素を無理に共通化しない
- 判断基準：「共通化後に読みやすくなるか」

#### 第7章：まとめ（Vol.1）

- props / emit / defineModel / slot の4つが共通コンポーネントを支える仕組み
- レイアウト（MainLayout / SubLayout）は全ページの土台
- UIコンポーネント（ProductCard / BaseDialog）は継承パターンで拡張できる
- チーム規約：「新規ページは必ず MainLayout か SubLayout を使う」

---

## Vol.2：スタイル共通化（Vuetify テーマ）

### 章立て（全5章）

#### 第1章：Vuetify 4 のテーマシステム概要

- `createVuetify({ theme: { themes: {...} } })` に色を定義すると CSS変数が自動生成される
- 生成例：`--v-theme-primary: 33,150,243`
- `color="primary"` と書いた Vuetify コンポーネントはこの変数を参照する

#### 第2章：このプロジェクトの3テーマ

| テーマ名 | 特徴 | primary |
|---|---|---|
| `dark`（デフォルト） | 暗背景・青アクセント | `#2196F3` |
| `light` | 白背景・濃青 | `#1565C0` |
| `practice` | オレンジ基調 | `#E65100` |

テーマ切り替え：`useTheme().global.name.value = 'light'`

#### 第3章：色設定の粒度

| 粒度 | 手段 | 例 |
|---|---|---|
| アプリ全体 | `<v-app :theme="name">` | `themeStore` で切り替え |
| ページ・セクション単位 | コンポーネントの `theme` prop | `<MainLayout theme="light">` |
| 部品1つ | `color` prop に直値 | `<v-btn color="#E65100">` |
| CSS変数を直接上書き | `:style` で変数を渡す | `:style="{'--v-theme-primary': '255,0,0'}"` |

#### 第4章：セマンティックカラー vs 直値・カスタム色追加

- `color="primary"` → テーマ切り替えで自動追従
- `color="#E65100"` → テーマに関わらず固定
- カスタムセマンティックカラーの追加（`colors` に任意キーを追加可能）
- テーマで制御できる範囲の実測表：

| 項目 | 制御できるか | 手段 |
|---|---|---|
| 罫線の透明度 | ✅ | `variables['border-opacity']`（デフォルト 0.12） |
| 罫線の色 | ⚠️ 間接的のみ | `on-surface` カラーを変える |
| 文字の色 | ✅ | `on-surface` / `on-background` カラー |
| 文字の強調度 | ✅ | `high/medium-emphasis-opacity` |
| フォントファミリー | ✅ | `variables['--v-font-body']` 等 |
| フォントサイズ | ❌ Vuetify管轄外 | グローバルCSS上書きが必要 |
| カスタム変数 | ✅ 自由に追加 | `variables` に任意キー追加 |

#### 第5章：まとめ（Vol.2）

- 共通化した部品が `color="primary"` を使っていれば、テーマ切り替えで全体が変わる
- チーム規約：「色は直書きせず `color="primary"` 等セマンティック名を使う。固定したいときだけ直値」

---

## Vol.3：データ・通信・Store 設計

### 章立て（全6章）

#### 第1章：通信の共通化 — Orval 連携

**現状（モック直参照）→ 目標（Orval連携後）:**
```
現状: Pinia Store → mockProducts（ハードコード）
目標: Pinia Store → Orval生成API関数 → axios共通インスタンス → バックエンド
```

**4層の責任範囲:**

| 層 | ファイル | 共通化する内容 |
|---|---|---|
| HTTPクライアント | `src/lib/axios.ts` | baseURL・認証ヘッダ・インターセプター |
| API関数（自動生成） | `src/api/` | Orval が OpenAPI から生成。手書き不要 |
| 状態管理 | `src/stores/` | loading・error・data の3点セット |
| UI層 | `src/pages/`, `src/components/` | Store だけを見る。APIを直接呼ばない |

**Orval 設定（`orval.config.ts`）のコード例**

**モックからの移行パス:**

| フェーズ | データソース |
|---|---|
| 現在 | `mockProducts`（ハードコード） |
| API開発中 | MSW（Orval の `mock: true` で自動生成） |
| 本番 | `VITE_API_BASE_URL` 環境変数で切り替え |

#### 第2章：Pinia Store 設計方針 — Setup Store に統一

Options Store は使わない。Setup Store（`() => {}` 形式）に統一する。

```ts
// ✅ Setup Store（これを使う）
export const useXxxStore = defineStore('xxx', () => {
  const data = ref([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  return { data, loading, error }
})
```

#### 第3章：Store の3種類と責務

| 種類 | 実例 | 責務 |
|---|---|---|
| データStore | `useProductStore` | APIデータ + フィルター/ページング |
| UI設定Store | `useThemeStore` | テーマ選択・localStorage永続化 |
| 機能連携Store | `useScannerStore` | ページ間の処理フロー調整 |

#### 第4章：State の置き場所 — 4段階の使い分け

| 置き場所 | 使うべき場面 | 実例 |
|---|---|---|
| コンポーネントローカル `ref` | そのコンポーネントだけが使う | `dialogOpen`（SearchPage） |
| props / emit | 親子間1〜2階層のやり取り | `ProductCard` への `product` 渡し |
| Pinia Store | 複数ページ・コンポーネントが参照 | `selectedProduct`・`currentTheme` |
| URL（router クエリ） | リロード・ブックマークで復元したい | 検索キーワード・ページ番号 |

**判断フロー:**
```
複数ページで使うか？
├─ No  → ローカル ref か props/emit
└─ Yes → リロードで復元したいか？
            ├─ Yes → URL パラメータ or localStorage（Store経由）
            └─ No  → Pinia Store
```

#### 第5章：コンポーネントからの使い方・命名規則

**storeToRefs を使う:**
```ts
const store = useProductStore()
const { products, loading, error } = storeToRefs(store)  // リアクティブを保持
const { fetchProducts, resetPage } = store               // actionはそのまま
```

**命名規則:**

| 対象 | 規則 | 例 |
|---|---|---|
| Store 関数 | `use〇〇Store` | `useProductStore` |
| Store ID | 小文字キャメル | `'product'`, `'theme'` |
| State | `ref` / `reactive` | `const products = ref([])` |
| Getter | `computed` | `const filtered = computed(...)` |
| Action | 動詞から始まる関数 | `fetchProducts`, `setTheme` |

#### 第6章：まとめ（Vol.3）

- 通信は axios 共通インスタンス → Orval 生成関数 → Store の3層で管理
- Store は「Setup Store に統一・種類を意識・置き場所を判断フローで決める」
- チーム規約：「APIは Store 経由のみ・UIは Store を直接呼ばない」

---

## 技術選定（共通）

### スライド
- Reveal.js CDN を読み込むシングル HTML ファイル
- コードハイライトは Reveal.js 内蔵の `highlight.js`
- スタイル：各冊のテーマカラーを変えて視覚的に区別する

### Markdown
- GitHub / VSCode プレビューで読める標準 Markdown
- スライドと同じ章立て・同じコード例

---

## スコープ外（3冊共通）

- Vuex（Pinia に移行済みのため）
- テストの書き方
- SSR / Nuxt 対応
- Composable の詳細設計

---

## 参照元ファイル一覧

| ファイル | 使用する冊・章 |
|---|---|
| `src/components/layout/MainLayout.vue` | Vol.1 第3・4章 |
| `src/components/layout/SubLayout.vue` | Vol.1 第3章 |
| `src/pages/HomePage.vue` | Vol.1 第3章 After 例 |
| `src/pages/DetailPage.vue` | Vol.1 第3章 SubLayout 使用例 |
| `src/pages/SearchPage.vue` | Vol.1 第5章 呼び出しフロー |
| `src/components/product/ProductCard.vue` | Vol.1 第4・5章 |
| `src/components/dialog/BaseDialog.vue` | Vol.1 第4・5章 |
| `src/components/dialog/ConfirmDialog.vue` | Vol.1 第5章 継承パターン |
| `src/plugins/vuetify.ts` | Vol.2 第1・2章 |
| `src/stores/theme.ts` | Vol.2 第2章・Vol.3 第3章 |
| `orval.config.ts` | Vol.3 第1章 |
| `src/stores/product.ts` | Vol.3 第1・2・3章 |
| `src/stores/scannerStore.ts` | Vol.3 第3章 |
