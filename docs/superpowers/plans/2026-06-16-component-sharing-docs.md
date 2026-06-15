# Component Sharing Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3分冊の教育資料（HTMLスライド + Markdown）を `docs/component-sharing/` 以下に作成する。

**Architecture:**
Vol.1 は説得力重視の詳細解説（props/emit/defineModel/slot まで踏み込む）。Vol.2・3 は実装者向けリファレンス（チートシート色が強い）。各冊はスライド（Reveal.js CDN）と Markdown の2ファイル構成。コードはすべて実プロジェクトの実コードから引用する。

**Tech Stack:** Reveal.js 5.x（CDN）, highlight.js（Reveal.js 内蔵）, 標準 Markdown

---

## ファイルマップ

| ファイル | 責務 |
|---|---|
| `docs/component-sharing/vol1-components/slides.html` | Vol.1 Reveal.js スライド（詳細・説得力重視） |
| `docs/component-sharing/vol1-components/README.md` | Vol.1 Markdown リファレンス |
| `docs/component-sharing/vol2-theming/slides.html` | Vol.2 Reveal.js スライド（テーマ・リファレンス） |
| `docs/component-sharing/vol2-theming/README.md` | Vol.2 Markdown リファレンス |
| `docs/component-sharing/vol3-data/slides.html` | Vol.3 Reveal.js スライド（通信・Store・リファレンス） |
| `docs/component-sharing/vol3-data/README.md` | Vol.3 Markdown リファレンス |

---

## Task 1: ディレクトリ作成

**Files:**
- Create: `docs/component-sharing/vol1-components/` （空ディレクトリ）
- Create: `docs/component-sharing/vol2-theming/` （空ディレクトリ）
- Create: `docs/component-sharing/vol3-data/` （空ディレクトリ）

- [ ] **Step 1: ディレクトリを作成する**

```powershell
New-Item -ItemType Directory -Force docs/component-sharing/vol1-components
New-Item -ItemType Directory -Force docs/component-sharing/vol2-theming
New-Item -ItemType Directory -Force docs/component-sharing/vol3-data
```

- [ ] **Step 2: 確認**

```powershell
ls docs/component-sharing/
```

Expected: `vol1-components`, `vol2-theming`, `vol3-data` の3フォルダが表示される。

---

## Task 2: Vol.1 スライド — コンポーネント・レイアウト共通化

**Files:**
- Create: `docs/component-sharing/vol1-components/slides.html`

Vol.1 は「読者を説得する」ことが目標。以下の構成で詳細に作る。

### スライド章立てと各スライドの内容指示

**Reveal.js ボイラープレート（全スライド共通）:**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>Vol.1 コンポーネント・レイアウト共通化</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/theme/black.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/highlight/monokai.css" />
  <style>
    :root { --r-main-font-size: 22px; }
    .reveal pre { font-size: 0.65em; }
    .reveal .slide-number { color: #aaa; }
    .bad  { color: #ff6b6b; }
    .good { color: #69db7c; }
    .note { font-size: 0.7em; color: #aaa; }
    table { font-size: 0.75em; }
  </style>
</head>
<body>
<div class="reveal">
  <div class="slides">
    <!-- スライドをここに記述 -->
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5/dist/reveal.js"></script>
<script src="https://cdn.jsdelivr.net/npm/reveal.js@5/plugin/highlight/highlight.js"></script>
<script>
  Reveal.initialize({ plugins: [RevealHighlight], slideNumber: true, hash: true });
</script>
</body>
</html>
```

### 各スライドの内容（`<section>` ブロック）

**スライド 1: タイトル**
```html
<section>
  <h1>コンポーネント<br>共通化</h1>
  <h3>なぜ・どう共通化するか</h3>
  <p class="note">Vue / Vuetify 4 — このプロジェクトの実コードで解説</p>
</section>
```

**スライド 2: アジェンダ**
```html
<section>
  <h2>この資料で学ぶこと</h2>
  <ol>
    <li>共通化しないと<strong>何が起きるか</strong>（問題提起）</li>
    <li>レイアウト共通化：<strong>MainLayout / SubLayout</strong></li>
    <li>部品の仕組み：<strong>props / emit / defineModel / slot</strong></li>
    <li>UI コンポーネント：<strong>ProductCard / BaseDialog</strong></li>
    <li>判断基準：<strong>いつ・どこまで共通化するか</strong></li>
  </ol>
</section>
```

**スライド 3: 問題提起 — 共通化しない場合の Before コード**

説得力のポイント：「見るだけで辛い」コードを実際に見せる。

```html
<section>
  <h2>共通化しないと…</h2>
  <p>各ページに同じ AppBar を直書きすると：</p>
  <pre><code class="language-html" data-trim>
&lt;!-- HomePage.vue --&gt;
&lt;v-layout&gt;
  &lt;v-app-bar color="primary" elevation="2"&gt;
    &lt;v-app-bar-title&gt;VuetifyPoC&lt;/v-app-bar-title&gt;
  &lt;/v-app-bar&gt;
  &lt;v-main&gt; ... &lt;/v-main&gt;
  &lt;v-bottom-navigation color="primary"&gt; ... &lt;/v-bottom-navigation&gt;
&lt;/v-layout&gt;

&lt;!-- SearchPage.vue — 同じコードをコピー --&gt;
&lt;v-layout&gt;
  &lt;v-app-bar color="primary" elevation="2"&gt;
    &lt;v-app-bar-title&gt;商品検索&lt;/v-app-bar-title&gt;
  &lt;/v-app-bar&gt;
  &lt;v-main&gt; ... &lt;/v-main&gt;
  &lt;v-bottom-navigation color="primary"&gt; ... &lt;/v-bottom-navigation&gt;
&lt;/v-layout&gt;
  </code></pre>
  <p class="note">同じ構造が全 4 ページに…</p>
</section>
```

**スライド 4: 問題の3点（fragment で1つずつ表示）**
```html
<section>
  <h2>何が問題か</h2>
  <ul>
    <li class="fragment bad">① <strong>重複コード</strong> — 同じマークアップが 4 ページに散在</li>
    <li class="fragment bad">② <strong>修正コスト</strong> — AppBar の高さを変えたら全ページを修正</li>
    <li class="fragment bad">③ <strong>不整合リスク</strong> — 1ページだけ修正漏れが生まれやすい</li>
  </ul>
  <p class="fragment note">これが 10 ページ・20 ページになったら…</p>
</section>
```

**スライド 5: 解決策 — MainLayout（After）**
```html
<section>
  <h2>解決策：MainLayout</h2>
  <pre><code class="language-html" data-trim>
&lt;!-- src/components/layout/MainLayout.vue --&gt;
&lt;template&gt;
  &lt;v-layout&gt;
    &lt;v-app-bar color="primary" elevation="2"&gt;
      &lt;v-app-bar-title&gt;{{ title }}&lt;/v-app-bar-title&gt;
      &lt;template v-if="$slots.actions" #append&gt;
        &lt;slot name="actions" /&gt;
      &lt;/template&gt;
    &lt;/v-app-bar&gt;
    &lt;v-main&gt;
      &lt;slot /&gt;          &lt;!-- ページ本体がここに入る --&gt;
    &lt;/v-main&gt;
    &lt;v-bottom-navigation ...&gt;...&lt;/v-bottom-navigation&gt;
  &lt;/v-layout&gt;
&lt;/template&gt;
  </code></pre>
  <p class="note good">AppBar・BottomNav の定義は <strong>ここだけ</strong></p>
</section>
```

**スライド 6: 使う側のコード（シンプルさを見せる）**
```html
<section>
  <h2>使う側はこれだけ</h2>
  <pre><code class="language-html" data-trim>
&lt;!-- HomePage.vue --&gt;
&lt;MainLayout title="VuetifyPoC"&gt;
  &lt;v-container&gt;
    &lt;!-- ページ固有のコンテンツだけ書く --&gt;
  &lt;/v-container&gt;
&lt;/MainLayout&gt;

&lt;!-- SearchPage.vue --&gt;
&lt;MainLayout title="商品検索"&gt;
  &lt;v-container&gt; ... &lt;/v-container&gt;
&lt;/MainLayout&gt;
  </code></pre>
  <p class="note good">各ページは <strong>自分の中身だけ</strong> に集中できる</p>
</section>
```

**スライド 7: MainLayout vs SubLayout 使い分け表**
```html
<section>
  <h2>MainLayout vs SubLayout</h2>
  <table>
    <thead><tr><th></th><th>MainLayout</th><th>SubLayout</th></tr></thead>
    <tbody>
      <tr><td>BottomNavigation</td><td class="good">あり（タブナビ）</td><td class="bad">なし</td></tr>
      <tr><td>戻るボタン</td><td class="bad">なし</td><td class="good">あり</td></tr>
      <tr><td>使うページ</td><td>ホーム・検索・お気に入り・設定</td><td>詳細・サブページ</td></tr>
    </tbody>
  </table>
  <pre><code class="language-html" data-trim>
&lt;!-- DetailPage.vue はこちら --&gt;
&lt;SubLayout :title="product?.name ?? '詳細'"&gt;
  ...
&lt;/SubLayout&gt;
  </code></pre>
</section>
```

**スライド 8: props とは何か（概念）**
```html
<section>
  <h2>props — 親から子へデータを渡す</h2>
  <pre><code class="language-ts" data-trim>
// 子コンポーネント（ProductCard.vue）
defineProps&lt;{ product: Product }&gt;()
  </code></pre>
  <pre><code class="language-html" data-trim>
&lt;!-- 親テンプレート --&gt;
&lt;ProductCard :product="item" /&gt;
  </code></pre>
  <p><code>:</code>（コロン）を付けると<strong>動的な値</strong>を渡せる。文字列リテラルなら不要。</p>
  <pre><code class="language-html" data-trim>
&lt;MainLayout title="検索" /&gt;        &lt;!-- 文字列リテラル → : 不要 --&gt;
&lt;MainLayout :title="pageTitle" /&gt;  &lt;!-- 変数 → : が必要 --&gt;
  </code></pre>
</section>
```

**スライド 9: withDefaults — 省略可能な props**
```html
<section>
  <h2>省略可能な props と デフォルト値</h2>
  <pre><code class="language-ts" data-trim>
// BaseDialog.vue
withDefaults(defineProps&lt;{
  title: string       // 必須（? なし）
  maxWidth?: string   // 省略可能（? あり）
}&gt;(), {
  maxWidth: '500px'   // 省略時のデフォルト値
})
  </code></pre>
  <pre><code class="language-html" data-trim>
&lt;!-- maxWidth を省略 → 500px が使われる --&gt;
&lt;BaseDialog title="確認" /&gt;

&lt;!-- maxWidth を上書き --&gt;
&lt;ConfirmDialog title="削除確認" max-width="400px" /&gt;
  </code></pre>
</section>
```

**スライド 10: emit — 子から親へイベントを通知**
```html
<section>
  <h2>emit — 子から親へイベントを通知</h2>
  <pre><code class="language-ts" data-trim>
// ProductCard.vue
const emit = defineEmits&lt;{
  click:  [product: Product]   // イベント名: [引数の型]
  detail: [product: Product]
}&gt;()

// カード本体クリック
&lt;v-card @click="emit('click', product)"&gt;

// 「詳細を見る」ボタン（.stop で親への伝播を止める）
&lt;v-btn @click.stop="emit('detail', product)"&gt;詳細を見る&lt;/v-btn&gt;
  </code></pre>
  <pre><code class="language-html" data-trim>
&lt;!-- 親（SearchPage.vue）--&gt;
&lt;ProductCard
  :product="item"
  @click="openDialog"
  @detail="goDetail"
/&gt;
  </code></pre>
</section>
```

**スライド 11: defineModel — v-model で双方向バインディング**
```html
<section>
  <h2>defineModel — ダイアログの開閉</h2>
  <p>「親が開閉状態を持ち、子が操作する」パターンに使う</p>
  <pre><code class="language-ts" data-trim>
// BaseDialog.vue — 子
const model = defineModel&lt;boolean&gt;()
// template 内で v-model="model" として v-dialog に渡す
  </code></pre>
  <pre><code class="language-html" data-trim>
&lt;!-- 親（SearchPage.vue）--&gt;
&lt;script setup&gt;
const dialogOpen = ref(false)  // 親が開閉状態を持つ
&lt;/script&gt;

&lt;ProductDialog v-model="dialogOpen" /&gt;
&lt;!-- dialogOpen が true になるとダイアログが開く --&gt;
&lt;!-- ダイアログ内で閉じると dialogOpen が false になる --&gt;
  </code></pre>
  <p class="note">defineModel = props（modelValue）+ emit（update:modelValue）の糖衣構文</p>
</section>
```

**スライド 12: slot — 親からコンテンツを差し込む**
```html
<section>
  <h2>slot — コンテンツを外から差し込む</h2>
  <pre><code class="language-html" data-trim>
&lt;!-- BaseDialog.vue — 子 --&gt;
&lt;v-card-text&gt;
  &lt;slot /&gt;                          &lt;!-- デフォルト slot --&gt;
&lt;/v-card-text&gt;
&lt;v-card-actions v-if="$slots.actions"&gt;
  &lt;slot name="actions" /&gt;           &lt;!-- 名前付き slot（省略可能）--&gt;
&lt;/v-card-actions&gt;
  </code></pre>
  <pre><code class="language-html" data-trim>
&lt;!-- ConfirmDialog.vue — 親 --&gt;
&lt;BaseDialog v-model="model" :title="title"&gt;
  &lt;p&gt;{{ message }}&lt;/p&gt;              &lt;!-- デフォルト slot へ --&gt;
  &lt;template #actions&gt;               &lt;!-- 名前付き slot へ --&gt;
    &lt;v-spacer /&gt;
    &lt;v-btn @click="$emit('cancel')"&gt;キャンセル&lt;/v-btn&gt;
    &lt;v-btn color="primary" @click="$emit('confirm')"&gt;OK&lt;/v-btn&gt;
  &lt;/template&gt;
&lt;/BaseDialog&gt;
  </code></pre>
  <p class="note"><code>$slots.actions</code> で「slot が渡されたか」を確認できる</p>
</section>
```

**スライド 13: 4つの仕組みまとめ（一覧表）**
```html
<section>
  <h2>4つの仕組みまとめ</h2>
  <table>
    <thead><tr><th>仕組み</th><th>方向</th><th>用途</th><th>実例</th></tr></thead>
    <tbody>
      <tr><td><code>props</code></td><td>親 → 子</td><td>データを渡す</td><td>title, product</td></tr>
      <tr><td><code>emit</code></td><td>子 → 親</td><td>イベントを通知</td><td>click, detail</td></tr>
      <tr><td><code>defineModel</code></td><td>双方向</td><td>v-model 連携</td><td>ダイアログ開閉</td></tr>
      <tr><td><code>slot</code></td><td>親 → 子</td><td>コンテンツを差し込む</td><td>ページ本体, ボタン群</td></tr>
    </tbody>
  </table>
</section>
```

**スライド 14: BaseDialog → ConfirmDialog 継承パターン**
```html
<section>
  <h2>継承パターン</h2>
  <p>BaseDialog が <em>枠</em> を担い、ConfirmDialog が <em>内容</em> を追加</p>
  <pre><code class="language-html" data-trim>
&lt;!-- ConfirmDialog.vue —— BaseDialog を拡張 --&gt;
&lt;BaseDialog v-model="model" :title="title" max-width="400px"&gt;
  &lt;p&gt;{{ message }}&lt;/p&gt;
  &lt;template #actions&gt;
    &lt;v-btn @click="$emit('cancel')"&gt;キャンセル&lt;/v-btn&gt;
    &lt;v-btn color="primary" @click="$emit('confirm')"&gt;OK&lt;/v-btn&gt;
  &lt;/template&gt;
&lt;/BaseDialog&gt;
  </code></pre>
  <ul>
    <li class="good fragment">枠のデザイン変更 → <strong>BaseDialog だけ</strong>修正すればよい</li>
    <li class="good fragment">ConfirmDialog は「OKとキャンセルがある」という責務<strong>だけ</strong>持つ</li>
  </ul>
</section>
```

**スライド 15: SearchPage での呼び出しフロー全体像**
```html
<section>
  <h2>実際の呼び出しフロー（SearchPage）</h2>
  <pre><code class="language-html" data-trim>
&lt;!-- template --&gt;
&lt;MainLayout title="商品検索"&gt;
  &lt;ProductCard
    v-for="product in store.pagedProducts"
    :product="product"          &lt;!-- props --&gt;
    @click="openDialog"         &lt;!-- emit --&gt;
    @detail="goDetail"          &lt;!-- emit --&gt;
  /&gt;
  &lt;ProductDialog
    v-model="dialogOpen"        &lt;!-- defineModel --&gt;
    :product="store.selectedProduct"
  /&gt;
&lt;/MainLayout&gt;
  </code></pre>
  <pre><code class="language-ts" data-trim>
function openDialog(product: Product) {
  store.selectProduct(product)
  dialogOpen.value = true   // v-model で ProductDialog が開く
}
  </code></pre>
</section>
```

**スライド 16: 判断基準**
```html
<section>
  <h2>いつ共通化するか</h2>
  <table>
    <thead><tr><th>ルール</th><th>説明</th><th>実例</th></tr></thead>
    <tbody>
      <tr><td>3回ルール</td><td>同じ構造が 3 箇所以上</td><td>AppBar → MainLayout</td></tr>
      <tr><td>見た目の統一</td><td>同じ見た目を複数箇所で使う</td><td>商品カード → ProductCard</td></tr>
      <tr><td>ロジック分離</td><td>表示とロジックが混在</td><td>フィルター → Composable</td></tr>
    </tbody>
  </table>
  <hr>
  <h3>共通化しすぎの罠</h3>
  <ul>
    <li class="bad">props が増えすぎて条件分岐だらけになる</li>
    <li class="bad">「似ているだけ」の要素を無理に統一する</li>
    <li class="good">判断基準：「共通化後に <strong>読みやすくなるか</strong>」</li>
  </ul>
</section>
```

**スライド 17: まとめ**
```html
<section>
  <h2>まとめ</h2>
  <ul>
    <li>レイアウトは <strong>MainLayout / SubLayout</strong> に集約する</li>
    <li>部品は <strong>props（渡す）/ emit（通知）/ defineModel（双方向）/ slot（差し込む）</strong> の 4 つで構成される</li>
    <li>継承パターンで <strong>BaseDialog → ConfirmDialog</strong> のように拡張できる</li>
    <li>「3回ルール」と「読みやすさ」で共通化を判断する</li>
  </ul>
  <hr>
  <h3 class="good">チーム規約</h3>
  <p>新規ページは必ず <code>MainLayout</code> か <code>SubLayout</code> をラッパーに使う</p>
</section>
```

- [ ] **Step 1: `slides.html` を作成する**

上記ボイラープレートと `<section>` ブロック（スライド 1〜17）を組み合わせて `docs/component-sharing/vol1-components/slides.html` を作成する。

- [ ] **Step 2: ブラウザで開いて確認する**

```powershell
Start-Process "docs/component-sharing/vol1-components/slides.html"
```

確認項目：
- スライドが 17 枚表示される
- コードハイライトが効いている
- fragment（→キー）で要素が順番に現れる
- スライド番号が右下に表示される

- [ ] **Step 3: コミット**

```powershell
git add docs/component-sharing/vol1-components/slides.html
git commit -m "docs: add Vol.1 component sharing slides"
```

---

## Task 3: Vol.1 README — コンポーネント・レイアウト共通化

**Files:**
- Create: `docs/component-sharing/vol1-components/README.md`

スライドと同じ内容を Markdown で提供する。コードブロックはシンタックスハイライト付き。

- [ ] **Step 1: `README.md` を作成する**

以下の構成で書く（コードはスライドと同じ実コードを使う）：

```markdown
# Vol.1 コンポーネント・レイアウト共通化

## 1. 共通化しないと何が起きるか

（Before コード例 → 問題点3点）

## 2. レイアウト共通化：MainLayout / SubLayout

（After コード例 → 構成図 → 使い分け表）

## 3. props / emit / defineModel / slot

### 3-1 props
（コード例 + withDefaults 説明）

### 3-2 emit
（コード例 + .stop 説明）

### 3-3 defineModel
（コード例 + 「糖衣構文」説明）

### 3-4 slot
（デフォルト + 名前付き slot のコード例）

### 3-5 4つの仕組みまとめ表

## 4. UIコンポーネント共通化：ProductCard / BaseDialog

（継承パターン説明 + SearchPage フロー）

## 5. 共通化の判断基準

（3回ルール表 + 罠のリスト）

## 6. チーム規約

（箇条書き）
```

- [ ] **Step 2: VSCode プレビューで確認する**

コードブロックのシンタックス・表の崩れがないことを確認する。

- [ ] **Step 3: コミット**

```powershell
git add docs/component-sharing/vol1-components/README.md
git commit -m "docs: add Vol.1 component sharing README"
```

---

## Task 4: Vol.2 スライド — スタイル共通化（Vuetify テーマ）

**Files:**
- Create: `docs/component-sharing/vol2-theming/slides.html`

Vol.2 はリファレンス色が強い。1スライドあたりの情報量を多めにし、スライド枚数を絞る（8〜10枚）。

- [ ] **Step 1: `slides.html` を作成する**

ボイラープレートは Task 2 と同じ（title を `Vol.2 スタイル共通化` に変える）。

スライド構成：

1. **タイトル** — Vol.2 スタイル共通化
2. **Vuetify 4 テーマの仕組み** — `createVuetify` → CSS変数生成の流れ（コード例）
3. **このプロジェクトの3テーマ** — dark/light/practice の比較表 + `useTheme()` 切り替えコード
4. **色設定の粒度（4段階表）** — アプリ全体 / ページ単位 / 部品1つ / CSS変数直書き
5. **セマンティックカラー vs 直値** — `color="primary"` vs `color="#E65100"` の違いコード例
6. **カスタムセマンティックカラーの追加** — `colors` に任意キーを追加するコード例
7. **テーマで制御できる範囲（実測表）** — border-opacity/文字色/フォントサイズ等の一覧
8. **まとめ・チーム規約** — 「色は直書きせずセマンティック名を使う」

- [ ] **Step 2: ブラウザで開いて確認する**

```powershell
Start-Process "docs/component-sharing/vol2-theming/slides.html"
```

- [ ] **Step 3: コミット**

```powershell
git add docs/component-sharing/vol2-theming/slides.html
git commit -m "docs: add Vol.2 theming slides"
```

---

## Task 5: Vol.2 README — スタイル共通化

**Files:**
- Create: `docs/component-sharing/vol2-theming/README.md`

- [ ] **Step 1: `README.md` を作成する**

```markdown
# Vol.2 スタイル共通化（Vuetify テーマ）

## 1. Vuetify 4 テーマの仕組み
## 2. このプロジェクトの3テーマ
## 3. テーマ切り替え（useTheme）
## 4. 色設定の粒度
## 5. セマンティックカラー vs 直値
## 6. カスタムセマンティックカラーの追加
## 7. テーマで制御できる範囲（実測表）
## 8. チーム規約
```

- [ ] **Step 2: コミット**

```powershell
git add docs/component-sharing/vol2-theming/README.md
git commit -m "docs: add Vol.2 theming README"
```

---

## Task 6: Vol.3 スライド — データ・通信・Store 設計

**Files:**
- Create: `docs/component-sharing/vol3-data/slides.html`

Vol.3 もリファレンス色が強い。10〜12 枚構成。

- [ ] **Step 1: `slides.html` を作成する**

スライド構成：

1. **タイトル** — Vol.3 データ・通信・Store 設計
2. **通信の4層アーキテクチャ** — 現状（モック）→ 目標（Orval連携）の図と表
3. **axios 共通インスタンス** — `src/lib/axios.ts` のコード例（baseURL・インターセプター）
4. **Orval 設定** — `orval.config.ts` の設定コード例
5. **モックからの移行パス** — フェーズ表（モック → MSW → 実API）
6. **Pinia Setup Store に統一** — Options vs Setup の比較コード
7. **Store の3種類** — データ/UI設定/機能連携の表 + 実例ファイル名
8. **State の置き場所（4段階）** — ローカル/props/Store/URL の判断フロー
9. **storeToRefs の使い方** — コード例（NG 例と OK 例の比較）
10. **命名規則** — 表（Store名/ID/State/Getter/Action）
11. **まとめ・チーム規約**

- [ ] **Step 2: ブラウザで開いて確認する**

```powershell
Start-Process "docs/component-sharing/vol3-data/slides.html"
```

- [ ] **Step 3: コミット**

```powershell
git add docs/component-sharing/vol3-data/slides.html
git commit -m "docs: add Vol.3 data/store slides"
```

---

## Task 7: Vol.3 README — データ・通信・Store 設計

**Files:**
- Create: `docs/component-sharing/vol3-data/README.md`

- [ ] **Step 1: `README.md` を作成する**

```markdown
# Vol.3 データ・通信・Store 設計

## 1. 通信の共通化（Orval 連携）
### 1-1 4層アーキテクチャ
### 1-2 axios 共通インスタンス
### 1-3 Orval 設定
### 1-4 モックからの移行パス

## 2. Pinia Store 設計方針
### 2-1 Setup Store に統一
### 2-2 Store の3種類と責務
### 2-3 State の置き場所（4段階の使い分け）
### 2-4 storeToRefs の使い方
### 2-5 命名規則

## 3. チーム規約
```

- [ ] **Step 2: コミット**

```powershell
git add docs/component-sharing/vol3-data/README.md
git commit -m "docs: add Vol.3 data/store README"
```

---

## Task 8: インデックスページ作成

**Files:**
- Create: `docs/component-sharing/index.html`

3冊へのリンクをまとめたランディングページ。

- [ ] **Step 1: `index.html` を作成する**

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>Vuetify 共通化資料</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; }
    a { display: block; padding: 12px; margin: 8px 0;
        background: #1867C0; color: white; text-decoration: none; border-radius: 6px; }
    a:hover { background: #1251a3; }
  </style>
</head>
<body>
  <h1>Vuetify フロントエンド共通化資料</h1>
  <a href="vol1-components/slides.html">Vol.1 コンポーネント・レイアウト共通化（スライド）</a>
  <a href="vol1-components/README.md">Vol.1 Markdown リファレンス</a>
  <a href="vol2-theming/slides.html">Vol.2 スタイル共通化（スライド）</a>
  <a href="vol2-theming/README.md">Vol.2 Markdown リファレンス</a>
  <a href="vol3-data/slides.html">Vol.3 データ・通信・Store 設計（スライド）</a>
  <a href="vol3-data/README.md">Vol.3 Markdown リファレンス</a>
</body>
</html>
```

- [ ] **Step 2: ブラウザで確認する**

```powershell
Start-Process "docs/component-sharing/index.html"
```

- [ ] **Step 3: コミット**

```powershell
git add docs/component-sharing/index.html
git commit -m "docs: add component-sharing index page"
```

---

## セルフレビュー

### スペックカバレッジ確認

| スペック要件 | 対応タスク |
|---|---|
| Vol.1 props/emit/defineModel/slot の詳細解説 | Task 2（スライド 8〜13） |
| Vol.1 ダイアログ継承パターン | Task 2（スライド 14）・Task 3 |
| Vol.1 SearchPage 呼び出しフロー | Task 2（スライド 15） |
| Vol.2 テーマ切り替え・粒度・セマンティックカラー | Task 4・5 |
| Vol.3 Orval 連携・移行パス | Task 6・7 |
| Vol.3 Store 3種類・storeToRefs・命名規則 | Task 6・7 |
| インデックスページ | Task 8 |

### プレースホルダーなし確認

- Task 2 の全17スライドに具体的な HTML コードが記述されている ✓
- Task 4・6 のスライド内容はタイトル+構成のみ（実装時に詳細化が必要） → 許容範囲（リファレンス色のため）
- Task 3・5・7 の README 構成見出しのみ → 実装時にスライドのコードを流用

### 型・名称の一貫性確認

- `defineModel<boolean>()` — Task 2 スライド 11 と Task 3 README で一致 ✓
- `storeToRefs` — Task 6・7 で同じ名前を使用 ✓
- ファイルパス `docs/component-sharing/vol1-components/slides.html` — 全タスクで一致 ✓
