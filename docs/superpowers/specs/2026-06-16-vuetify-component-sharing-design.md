# 設計ドキュメント：Vuetify コンポーネント共通化資料

**日付:** 2026-06-16  
**対象:** Vue/Vuetify 入門者〜中級者、チーム規約共有  
**構成アプローチ:** 問題提起 → 解決策型

---

## 目的

Vuetify 4 プロジェクトにおけるコンポーネント共通化の意義・手法・判断基準を、
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

### 第6章：テーマ切り替え — CSS変数と Vuetify 4 のスタイル共通化

**伝えたいこと:** コンポーネント共通化とテーマ機能を組み合わせると、1箇所の定義変更でアプリ全体の見た目が切り替わる。

**内容:**

#### Vuetify 4 のテーマ仕組み
- `createVuetify({ theme: { themes: { ... } } })` に色を定義すると、Vuetify が自動で CSS カスタムプロパティ（CSS変数）を生成する
- 生成される変数の例：
  ```css
  /* テーマ "dark" 適用時 */
  :root {
    --v-theme-primary: 33, 150, 243;   /* #2196F3 */
    --v-theme-background: 18, 18, 18;  /* #121212 */
    --v-theme-surface: 30, 30, 30;     /* #1E1E1E */
  }
  ```
- `color="primary"` と書いた Vuetify コンポーネントは、この変数を参照するため**テーマを切り替えるだけで色が変わる**

#### このプロジェクトの3テーマ（`src/plugins/vuetify.ts`）

| テーマ名 | 特徴 | primary カラー |
|---|---|---|
| `dark`（デフォルト） | 暗背景・青アクセント | `#2196F3` |
| `light` | 白背景・濃青 | `#1565C0` |
| `practice` | オレンジ基調 | `#E65100` |

#### テーマ切り替えの実装（`useTheme`）
```ts
import { useTheme } from 'vuetify'
const theme = useTheme()
theme.global.name.value = 'light'   // 'dark' | 'light' | 'practice'
```

#### 色設定の粒度：3つの手段

| 粒度 | 手段 | 例 |
|---|---|---|
| アプリ全体 | `<v-app :theme="name">` | `themeStore` で dark/light/practice を切り替え（今の実装） |
| ページ・セクション単位 | コンポーネントの `theme` prop | `<MainLayout theme="light">` → その子孫だけライトテーマになる |
| 部品1つ | `color` prop に直値 | `<v-btn color="#E65100">` → テーマに関わらず固定色 |
| CSS変数を直接上書き | `:style` で変数を渡す | `:style="{'--v-theme-primary': '255,0,0'}"` でスコープ限定上書き |

#### セマンティックカラー vs 直値：設計上の判断基準

- `color="primary"` のように**セマンティックな色名**を使う → テーマ切り替えで自動追従する
- `color="#E65100"` のように**hex を直書き**する → テーマを切り替えても変わらない（固定）
- **ルール：テーマで一括管理したいものはセマンティック名、意図的に固定したいものだけ直値**

#### テーマで制御できる範囲（実測値）

| 項目 | 制御できるか | 手段 |
|---|---|---|
| 罫線の透明度 | ✅ | `variables['border-opacity']`（デフォルト 0.12） |
| 罫線の色 | ⚠️ 間接的のみ | `on-surface` カラーを変える（直接の border-color 変数はない） |
| 文字の色 | ✅ | `on-surface` / `on-background` セマンティックカラー |
| 文字の強調度 | ✅ | `variables['high-emphasis-opacity']` / `['medium-emphasis-opacity']` |
| フォントファミリー | ✅ | `variables['--v-font-body']` / `['--v-font-heading']` |
| フォントサイズ | ❌ Vuetify管轄外 | `.text-h1` 等はCSSハードコード。グローバルCSS上書きが必要 |
| カスタム変数 | ✅ 自由に追加 | `variables` に任意キーを追加 → `--v-{key}` として生成される |

#### 共通化との相乗効果
- `MainLayout` の `v-app-bar color="primary"` はセマンティック名のため、テーマ変更で**全ページのAppBarが一括更新**される
- コンポーネントを共通化せず各ページに `color="#1565C0"` と直書きしていると、テーマ切り替えの恩恵が届かない
- **「コンポーネント共通化」×「セマンティックカラー」×「テーマ変数」= 1箇所の変更がアプリ全体に伝わる設計**

### 第7章：通信の共通化 — Orval 連携

**伝えたいこと:** コンポーネント共通化と同じ思想で、API 通信も「1箇所に集約して共通化」できる。Orval を使うと OpenAPI 定義から型付きAPI関数が自動生成され、手書きの通信コードがゼロになる。

#### 現状と目指す構成

**現状（モック直参照）:**
```
Pinia Store → mockProducts（ハードコード）
```

**目標（Orval 連携後）:**
```
Pinia Store → Orval 生成API関数 → axios カスタムインスタンス → バックエンド
                                   ↑
                            共通の認証ヘッダ・エラー処理・タイムアウト
```

#### 4つの層と共通化の責任範囲

| 層 | ファイル | 共通化する内容 |
|---|---|---|
| HTTPクライアント | `src/lib/axios.ts` | baseURL・認証ヘッダ・インターセプター（401 リダイレクト等） |
| API関数（自動生成） | `src/api/` | Orval が OpenAPI から生成。手書き不要 |
| 状態管理 | `src/stores/` | Pinia store がAPI関数を呼ぶ。ローディング・エラー状態を持つ |
| UI層 | `src/pages/`, `src/components/` | Store だけを見る。APIを直接呼ばない |

#### HTTPクライアントの共通化（`src/lib/axios.ts`）

```ts
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// 共通リクエスト処理（認証トークン付与）
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 共通エラー処理（401 で自動ログアウト等）
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) router.push('/login')
    return Promise.reject(err)
  }
)
```

#### Orval 設定（`orval.config.ts`）

```ts
export default defineConfig({
  product: {
    input: './openapi/product.yaml',
    output: {
      target: './src/api/product.ts',
      client: 'axios',
      override: {
        mutator: {
          path: './src/lib/axios.ts', // カスタムインスタンスを使う
          name: 'apiClient',
        },
      },
    },
  },
})
```

→ `npx orval` で `src/api/product.ts` に型付き関数が自動生成される。

#### Store での呼び出しパターン（`src/stores/product.ts`）

```ts
import { getProducts, getProductById } from '@/api/product'

export const useProductStore = defineStore('product', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProducts() {
    loading.value = true
    error.value = null
    try {
      const res = await getProducts()
      products.value = res.data
    } catch (e) {
      error.value = 'データの取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  return { products, loading, error, fetchProducts }
})
```

#### モックからの移行パス

開発フェーズに応じて段階的に切り替えられる：

| フェーズ | データソース | 切り替え方法 |
|---|---|---|
| 現在 | `mockProducts`（ハードコード） | — |
| API開発中 | MSW（Mock Service Worker） | Orval の `mock: true` オプションで自動生成 |
| 本番 | 実API | `VITE_API_BASE_URL` を環境変数で切り替え |

#### Store が持つべき状態（共通パターン）

```ts
const data = ref([])      // APIレスポンス
const loading = ref(false) // 通信中フラグ（v-skeleton-loaderと連動）
const error = ref(null)    // エラーメッセージ（v-alertと連動）
```

UI コンポーネントはこの3つを store から受け取るだけでよい。

### 第8章：Store の設計方針共通化 — Pinia

**伝えたいこと:** Store は「何でも入れる箱」ではない。種類・責務・書き方を統一することで、チーム間の理解のずれをなくす。

#### このプロジェクトの Store 一覧（実例）

| Store | ファイル | 種類 | 責務 |
|---|---|---|---|
| `useProductStore` | `stores/product.ts` | データStore | 商品一覧・フィルター・ページング |
| `useThemeStore` | `stores/theme.ts` | UI設定Store | テーマ選択・localStorage永続化 |
| `useScannerStore` | `stores/scannerStore.ts` | 機能連携Store | スキャナーページへの遷移フロー調整 |

#### ルール1：Setup Store 記法に統一する

Pinia には2つの書き方があるが、**このプロジェクトは Setup Store（Composition スタイル）に統一する**。

```ts
// ❌ Options Store（使わない）
export const useXxxStore = defineStore('xxx', {
  state: () => ({ count: 0 }),
  actions: { increment() { this.count++ } },
})

// ✅ Setup Store（これを使う）
export const useXxxStore = defineStore('xxx', () => {
  const count = ref(0)
  function increment() { count.value++ }
  return { count, increment }
})
```

理由：Composition API との一貫性・型推論が強い・`<script setup>` と同じ感覚で書ける。

#### ルール2：Store の種類と責務を把握する

**① データStore**（`useProductStore` が代表例）

外部データの取得・加工・フィルタリングを担う。常に `loading` / `error` / `data` の3点セットを持つ。

```ts
const products = ref<Product[]>([])
const loading  = ref(false)
const error    = ref<string | null>(null)
```

**② UI設定Store**（`useThemeStore` が代表例）

ページをまたいで共有が必要な UI 状態。永続化が必要なものは localStorage に保存する。

```ts
const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null
const currentTheme = ref<AppTheme>(saved ?? 'dark')

function setTheme(theme: AppTheme) {
  currentTheme.value = theme
  localStorage.setItem(STORAGE_KEY, theme)  // 同時に保存
}
```

**③ 機能連携Store**（`useScannerStore` が代表例）

ページ間の処理フローをつなぐ。コールバックやナビゲーションを仲介する役割。

```ts
let _callback: ((results: ScanResult[]) => void) | null = null  // コールバックは非リアクティブで持つ

function requestScan(mode, cb) {
  _callback = cb
  router.push('/scanner')  // スキャナーページへ遷移
}
function complete(results) {
  _callback?.(results)     // 呼び出し元に結果を返す
  router.back()
}
```

#### ルール3：Store に入れてよいもの・いけないもの

| 入れてよい | 入れてはいけない |
|---|---|
| APIレスポンスデータ | コンポーネント固有の開閉状態（`v-dialog` の `model-value` など） |
| ページをまたぐ共有状態 | 一時的なフォーム入力値 |
| 永続化が必要なUI設定 | DOM参照（`ref` で取る要素） |
| ページ間の処理フロー | 他Storeの状態を二重に保持（派生値は `computed` で） |

**判断基準：「このデータは2つ以上のページ/コンポーネントで共有するか？」** → Yesなら Store、NoならコンポーネントのローカルStateで十分。

#### ルール4：コンポーネントからの使い方

```ts
import { storeToRefs } from 'pinia'
import { useProductStore } from '@/stores/product'

const store = useProductStore()

// ✅ リアクティブな状態は storeToRefs で分割代入
const { products, loading, error } = storeToRefs(store)

// ✅ アクションはそのまま分割代入（リアクティビティ不要）
const { fetchProducts, resetPage } = store

// ❌ これはリアクティビティが失われる
const { products } = store  // NG — ref でラップされない
```

#### 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| Store 関数 | `use〇〇Store` | `useProductStore` |
| Store ID | 小文字キャメル | `'product'`, `'theme'`, `'scanner'` |
| State | `ref` / `reactive` | `const products = ref([])` |
| Getter | `computed` | `const filteredProducts = computed(...)` |
| Action | 動詞から始まる関数 | `fetchProducts`, `setTheme`, `resetPage` |

### 第9章：まとめ

- 共通化の3つのメリット：保守性・一貫性・開発速度
- テーマ機能との相乗効果：共通化した部品が CSS変数を通じてテーマに追従する
- 通信の共通化：Orval で型安全・Store で状態一元管理・UIはAPIを直接呼ばない
- このプロジェクトの構成まとめ（レイアウト / UIコンポーネント / Composable / テーマ / 通信 / Store の6層）
- チームへの適用方針：
  - 新規ページは `MainLayout` か `SubLayout` を選ぶ
  - 色は直書きせず `color="primary"` 等セマンティック名を使う
  - API 通信は必ず Store 経由・Orval 生成関数を使う

---

## 技術選定

### スライド（slides.html）

- **Reveal.js** を CDN から読み込むシングル HTML ファイル
- 外部依存なし（ファイル単体でブラウザから開ける）
- コードハイライトは Reveal.js 内蔵の `highlight.js` を使用
- スタイル：Vuetify のブランドカラー（`#1867C0`）をアクセントに使用
- 第6章でテーマ切り替えのライブデモ（JS で `document.querySelector('[data-v-theme]')` を操作）を組み込む予定

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
| `src/plugins/vuetify.ts` | 第6章テーマ定義例 |
| `orval.config.ts` | 第7章Orval設定例 |
| `src/stores/product.ts` | 第7章Store連携例・第8章データStore例 |
| `src/stores/theme.ts` | 第8章UI設定Store例 |
| `src/stores/scannerStore.ts` | 第8章機能連携Store例 |
