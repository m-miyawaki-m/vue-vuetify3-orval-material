# テーマ・カラー制御ガイド

## 目次

1. [テーマ一覧](#テーマ一覧)
2. [テーマの切り替え方法](#テーマの切り替え方法)
3. [App 全体への適用](#app-全体への適用)
4. [コンポーネント単位の色制御](#コンポーネント単位の色制御)
5. [新しいテーマを追加する](#新しいテーマを追加する)
6. [CSS 変数で色を参照する](#css-変数で色を参照する)
7. [部分的にテーマを切り替える](#部分的にテーマを切り替える)

---

## テーマ一覧

| キー | 名前 | 特徴 |
|---|---|---|
| `dark` | ダーク（デフォルト）| 暗い背景、青いアクセント |
| `light` | ライト | 薄青背景、濃い青アクセント |
| `practice` | プラクティス | 薄橙背景、オレンジアクセント |

定義場所: `src/plugins/vuetify.ts`

---

## テーマの切り替え方法

### Pinia ストアから切り替える（推奨）

```ts
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
themeStore.setTheme('dark')     // ダーク
themeStore.setTheme('light')    // ライト
themeStore.setTheme('practice') // プラクティス
```

- `localStorage` に自動保存されるため、次回起動時も維持される
- `App.vue` の `<v-app :theme="themeStore.currentTheme">` が自動的に反映

### useTheme() で直接切り替える（一時的な切り替えに）

```ts
import { useTheme } from 'vuetify'

const theme = useTheme()
theme.global.name.value = 'dark'
```

---

## App 全体への適用

`src/App.vue` で `v-app` に `:theme` を渡すとアプリ全体に適用されます。

```vue
<!-- src/App.vue -->
<template>
  <v-app :theme="themeStore.currentTheme">
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
const themeStore = useThemeStore()
</script>
```

`v-app` の子孫コンポーネントはすべてこのテーマを継承します。

---

## コンポーネント単位の色制御

### 1. `color` prop でテーマカラーを指定

```vue
<!-- テーマの named color を使う -->
<v-btn color="primary">プライマリ</v-btn>
<v-btn color="secondary">セカンダリ</v-btn>
<v-btn color="error">エラー</v-btn>
<v-btn color="success">成功</v-btn>

<!-- 直接カラーコードを指定（テーマに関係なく固定） -->
<v-btn color="#FF5722">固定オレンジ</v-btn>
<v-btn color="rgba(0,0,255,0.5)">半透明青</v-btn>
```

### 2. Vuetify ユーティリティクラス

```vue
<!-- テキスト色 -->
<p class="text-primary">プライマリ色テキスト</p>
<p class="text-secondary">セカンダリ色テキスト</p>
<p class="text-medium-emphasis">中程度の強調（グレー）</p>

<!-- 背景色 -->
<div class="bg-primary">プライマリ背景</div>
<div class="bg-surface">サーフェス背景</div>
<div class="bg-background">バックグラウンド背景</div>

<!-- surface-light / surface-dark でアクセント -->
<div class="bg-surface-variant">バリアント背景</div>
```

### 3. v-card / v-chip 等の `color` + `variant`

```vue
<!-- outlined: 枠線のみ -->
<v-card color="primary" variant="outlined">...</v-card>

<!-- tonal: 薄い背景色 -->
<v-chip color="success" variant="tonal">在庫あり</v-chip>

<!-- elevated: 影付き背景色 -->
<v-btn color="error" variant="elevated">削除</v-btn>
```

### 4. `variant` の種類

| variant | 見た目 |
|---|---|
| `elevated` | 影付き背景 |
| `flat` | 影なし背景 |
| `tonal` | 薄い背景（alpha付き） |
| `outlined` | 枠線のみ、背景透明 |
| `text` | テキストのみ |
| `plain` | ホバー効果なし |

---

## 新しいテーマを追加する

### Step 1: `src/plugins/vuetify.ts` にテーマ定義を追加

```ts
import type { ThemeDefinition } from 'vuetify'

const greenTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#E8F5E9',  // 薄緑
    surface:    '#FFFFFF',
    primary:    '#2E7D32',  // 濃緑
    secondary:  '#66BB6A',
    error:      '#C62828',
    info:       '#0277BD',
    success:    '#1B5E20',
    warning:    '#F57F17',
    'on-background': '#1A2E1A',
    'on-surface':    '#1A2E1A',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark, light, practice,
      green: greenTheme,  // ← 追加
    },
  },
})
```

### Step 2: `src/stores/theme.ts` の型と THEMES 配列に追加

```ts
export type AppTheme = 'dark' | 'light' | 'practice' | 'green'

export const THEMES: ThemeMeta[] = [
  // ...既存...
  {
    key: 'green',
    label: 'グリーン',
    description: '自然な緑基調。',
    preview: { bg: '#E8F5E9', surface: '#FFFFFF', primary: '#2E7D32', text: '#1A2E1A' },
  },
]
```

以上の2ファイルだけ変更すれば、SettingsPage に自動的に新テーマが追加されます。

---

## CSS 変数で色を参照する

Vuetify のテーマカラーは CSS カスタムプロパティとして公開されています。
テーマ切り替えに連動して自動更新されます。

```css
/* カラーは RGB チャンネルで提供される */
color: rgb(var(--v-theme-primary));
background-color: rgb(var(--v-theme-surface));

/* アルファ値を付けることも可能 */
background-color: rgba(var(--v-theme-primary), 0.1);
border: 1px solid rgba(var(--v-theme-primary), 0.5);
```

**主なカスタムプロパティ一覧:**

| 変数名 | 用途 |
|---|---|
| `--v-theme-background` | 全体背景色 |
| `--v-theme-surface` | カード等の表面色 |
| `--v-theme-primary` | プライマリアクセント |
| `--v-theme-secondary` | セカンダリアクセント |
| `--v-theme-error` | エラー色 |
| `--v-theme-success` | 成功色 |
| `--v-theme-warning` | 警告色 |
| `--v-theme-info` | 情報色 |
| `--v-theme-on-surface` | サーフェス上のテキスト色 |
| `--v-theme-on-primary` | primary上のテキスト色 |

---

## 部分的にテーマを切り替える

コンポーネントツリーの一部だけ別テーマで表示したい場合、
`v-theme` ディレクティブを使います。

```vue
<!-- このdivの子孫だけ dark テーマになる -->
<div v-theme="'dark'">
  <v-card>ダークテーマのカード</v-card>
  <v-btn color="primary">ダークのボタン</v-btn>
</div>

<!-- 通常テーマに戻る -->
<v-btn color="primary">通常のボタン</v-btn>
```

### 使いどころ

- プレビュー機能（テーマ切り替え前に見た目を確認）
- ダークヘッダー + ライトコンテンツの組み合わせ
- カード内のコントラストを意図的に変えたい場合

```vue
<!-- SettingsPage のテーマプレビューカードで応用 -->
<div v-theme="theme.key" class="rounded pa-3">
  <v-btn color="primary" size="small">プレビュー</v-btn>
</div>
```
