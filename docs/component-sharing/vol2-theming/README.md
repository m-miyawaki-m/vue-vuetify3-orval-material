# Vol.2 スタイル共通化（Vuetify テーマ）

> Vue / Vuetify 4.0.2 — このプロジェクトの実コードで解説

---

## 1. Vuetify 4 テーマの仕組み

テーマ定義を `createVuetify` に渡すと、Vuetify が CSS 変数を自動生成してページに注入する。

```ts
// src/plugins/vuetify.ts
createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark:     darkTheme,
      light:    lightTheme,
      practice: practiceTheme,
    },
  },
})
```

ブラウザには次のような変数が生成される（`#2196F3` → RGB 分解）：

```css
/* ブラウザで実際に生成される変数（例：dark テーマ） */
--v-theme-primary:    33,150,243;   /* #2196F3 */
--v-theme-secondary:  144,202,249;
--v-theme-background: 18,18,18;
```

`color="primary"` と指定したコンポーネントは内部で  
`background-color: rgb(var(--v-theme-primary))` を参照するため、テーマ切り替えと同時に色が変わる。

---

## 2. このプロジェクトの 3 テーマ

### テーマ定義（`src/plugins/vuetify.ts` 実コード）

```ts
/** ダークテーマ（デフォルト）: 標準的なダーク配色 */
const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface:    '#1E1E1E',
    primary:    '#2196F3',
    secondary:  '#90CAF9',
    error:      '#CF6679',
    info:       '#64B5F6',
    success:    '#81C784',
    warning:    '#FFB74D',
    'on-background': '#E0E0E0',
    'on-surface':    '#E0E0E0',
  },
}

/** ライトテーマ: 薄青基調 */
const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#EFF7FF',
    surface:    '#FFFFFF',
    primary:    '#1565C0',
    secondary:  '#42A5F5',
    error:      '#C62828',
    info:       '#0277BD',
    success:    '#2E7D32',
    warning:    '#E65100',
    'on-background': '#1A1A2E',
    'on-surface':    '#1A1A2E',
  },
}

/** プラクティステーマ: オレンジ基調 */
const practiceTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFF3E0',
    surface:    '#FFFFFF',
    primary:    '#E65100',
    secondary:  '#FFB300',
    error:      '#B71C1C',
    info:       '#01579B',
    success:    '#1B5E20',
    warning:    '#F9A825',
    'on-background': '#2E1A00',
    'on-surface':    '#2E1A00',
  },
}
```

### テーマ切り替え

Vuetify の composable で直接切り替えることもできる：

```ts
useTheme().global.name.value = 'light'
```

このプロジェクトでは Pinia ストアと localStorage を組み合わせて永続化している。

### themeStore パターン（`src/stores/theme.ts` 実コード）

```ts
export const useThemeStore = defineStore('theme', () => {
  const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null
  const currentTheme = ref<AppTheme>(saved ?? 'dark')

  function setTheme(theme: AppTheme) {
    currentTheme.value = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }

  return { currentTheme, setTheme }
})
```

`App.vue` で `<v-app :theme="themeStore.currentTheme">` にバインドすることで、アプリ全体にテーマが適用される。

```html
<!-- src/App.vue -->
<template>
  <div class="phone-wrapper">
    <v-app :theme="themeStore.currentTheme" class="phone-app">
      <router-view />
    </v-app>
  </div>
</template>
```

---

## 3. 色設定の粒度

| 粒度 | 手段 | 例 |
|------|------|----|
| アプリ全体 | `<v-app :theme="name">` | themeStore で切り替え |
| ページ・セクション単位 | `theme` prop | `<v-container theme="light">` （任意の Vuetify コンポーネントに適用可能） |
| 部品 1 つ | `color` prop 直値 | `<v-btn color="#E65100">` |
| CSS 変数直書き | `:style` | `:style="{'--v-theme-primary': '255,0,0'}"` |

通常はアプリ全体またはページ単位で十分。部品レベルの指定は例外的な固定色のみに限定する。

---

## 4. セマンティックカラー vs 直値

**推奨: テーマ追従（セマンティック名）**

```html
<v-btn color="primary">送信</v-btn>
<v-card color="surface">...</v-card>
<v-chip color="warning">注意</v-chip>
```

テーマ切り替えで色が一括して変わる。

**例外的: 固定色（直値）**

```html
<v-btn color="#E65100">送信</v-btn>
<v-card color="#FFFFFF">...</v-card>
```

テーマが変わっても色が変わらない。

**判断基準:**

- テーマで一括管理したい → セマンティック名（`primary` 等）
- ブランドカラー等で固定したい → 直値（`#E65100`）

---

## 5. カスタムセマンティックカラーの追加

`ThemeDefinition.colors` には `[key: string]: Color` の index signature があるため、任意のキーを追加できる。

```ts
// src/plugins/vuetify.ts — darkTheme の colors に追加する例
const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    // ... 既存のキー（primary, surface 等）はそのまま ...
    'brand-accent': '#FF6F00',   // カスタムセマンティックカラー（追加）
    'status-ok':    '#00C853',   // カスタムセマンティックカラー（追加）
  },
}
```

テンプレートではセマンティック名で参照できる：

```html
<v-card color="brand-accent">ブランド強調カード</v-card>
<v-chip color="status-ok">正常</v-chip>
```

Vuetify が CSS 変数を自動生成するため、CSS からも参照可能：

```css
color: rgb(var(--v-theme-brand-accent));
color: rgb(var(--v-theme-status-ok));
```

---

## 6. テーマで制御できる範囲

| 項目 | 制御できるか | 手段 |
|------|-------------|------|
| 罫線の透明度 | ✅ | `variables['border-opacity']`（デフォルト 0.12）※本プロジェクトでは未設定 |
| 罫線の色 | ⚠️ 間接的のみ | `on-surface` カラーを変える |
| 文字の色 | ✅ | `on-surface` / `on-background` |
| 文字の強調度 | ✅ | `high-emphasis-opacity`（dark: 0.87 / light: 1.0）、`medium-emphasis-opacity`（dark: 0.60 / light: 0.70）※本プロジェクトでは未設定 |
| フォントファミリー | ✅（要確認） | `--v-font-body` / `--v-font-heading`（Vuetify 4 の変数名は公式ドキュメントで要確認）※本プロジェクトでは未設定 |
| フォントサイズ | ❌ Vuetify 管轄外 | グローバル CSS 上書きが必要（`.text-h1` 等は固定） |
| カスタム変数 | ✅ 自由に追加 | `variables` に任意キー（本プロジェクトでは未設定、利用可能な標準機能） |

---

## 7. チーム規約

- Vuetify 4 のテーマは **CSS 変数** に変換されて自動適用される
- このプロジェクトは **3 テーマ**（dark / light / practice）を Pinia ストア + localStorage で切り替える
- 色の指定は **セマンティック名優先**（`primary`、`surface` 等）
- チーム独自の色は `colors` に **カスタムセマンティックカラー** として追加する
- `variables` で罫線・強調度・フォントを制御可能
- フォントサイズは Vuetify の管轄外 — グローバル CSS で対応
- 「色は直書きせず `color="primary"` 等セマンティック名を使う。固定したいときだけ直値（`#E65100`）を許容する。」
