# FlowStepper コンポーネント 設計仕様

## 概要

検索 → 一覧 → 詳細 の画面遷移フローを水平ステッパーで可視化する、表示専用の独立コンポーネント。SearchPage・ProductListPage・DetailPage のアプリバー直下に配置する。

---

## スコープ

| # | 内容 |
|---|---|
| 1 | `FlowStepper.vue` コンポーネント新規作成 |
| 2 | SearchPage・ProductListPage・DetailPage への組み込み |

**変更しないもの:** ルーター・ストア・既存レイアウトコンポーネント

---

## コンポーネント仕様

### ファイル

`src/components/ui/FlowStepper.vue`

### Props

| prop | 型 | 必須 | 説明 |
|---|---|---|---|
| `step` | `number` | ✓ | 現在のステップ（1 始まり） |
| `steps` | `string[]` | — | ステップラベル一覧。省略時は `['検索', '一覧', '詳細']` |

### Emits

なし（表示専用）

### 使用例

```vue
<!-- SearchPage -->
<FlowStepper :step="1" />

<!-- ProductListPage -->
<FlowStepper :step="2" />

<!-- DetailPage -->
<FlowStepper :step="3" />

<!-- 他フローへの流用例 -->
<FlowStepper :step="2" :steps="['入力', '確認', '完了']" />
```

---

## UI レイアウト

```
┌──────────────────────────────────┐
│ ←  商品検索              [AppBar] │
├──────────────────────────────────┤
│  ●━━━━━━●━━━━━━○               │  ← FlowStepper
│  検索    一覧    詳細             │    (step=2 の例)
├──────────────────────────────────┤
│  （ページ本文）                   │
└──────────────────────────────────┘
```

### ステップ状態の見た目

| 状態 | 円 | ライン | ラベル |
|---|---|---|---|
| 完了（step より前） | primary 塗りつぶし + ✓ アイコン | primary 色 | 通常 |
| 現在（step と一致） | primary 塗りつぶし | — | **太字** |
| 未来（step より後） | 枠線のみ（medium-emphasis） | medium-emphasis | グレー |

### 寸法・スタイル

- 高さ: 48px 固定
- 背景: `rgb(var(--v-theme-background))`（スクロール時にコンテンツが下に隠れないよう `sticky top-0`）
- 区切り線: 下部に `v-divider`
- ライン幅: ステップ間を flex-grow で均等分割

---

## 各ページへの組み込み

### SearchPage

```vue
<MainLayout title="商品検索" ...>
  <template #prepend>...</template>
  <FlowStepper :step="1" />   <!-- コンテンツ先頭に追加 -->
  <v-container>...</v-container>
</MainLayout>
```

### ProductListPage

```vue
<MainLayout title="検索結果" ...>
  <div class="list-header">
    <FlowStepper :step="2" />   <!-- list-header の先頭に追加 -->
    <div class="px-4 ...">      <!-- 既存の検索条件チップ -->
```

### DetailPage

```vue
<SubLayout :title="...">
  <FlowStepper :step="3" />   <!-- コンテンツ先頭に追加 -->
  <v-container>...</v-container>
</SubLayout>
```

---

## 制約・注意事項

- クリック操作は一切持たない（表示専用）
- `steps` のデフォルト値は `['検索', '一覧', '詳細']`。変更は props で渡す
- `step` が `steps.length` を超えた場合は全ステップを完了扱いにする
- `step` が 0 以下の場合は全ステップを未来扱いにする
