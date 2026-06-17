# クイックスキャナーボタン 設計書

**作成日**: 2026-06-17
**対象プロジェクト**: vue-vuetify3-orval-material (Vue 3 + Vuetify 4 + Capacitor 7)

---

## 概要

ホーム画面のメニューグリッド下に「クイックスキャン」ボタンを追加する。アイコン6個分（横3×縦2）の大きなボタンで、タップで `/scanner` ページへ遷移する。あわせて、メニューグリッドの空きセルの破線枠を非表示にする。

---

## 要件

- ホーム画面のメニューグリッド下に大きなスキャナーボタンを表示する
- ボタンをタップすると `/scanner` ページへ遷移する
- ボタンは常時表示（カスタマイズ対象外）
- メニューグリッドの空きセル（`item` が未定義）は何も描画しない（破線枠を非表示）

---

## 画面仕様

### ホーム画面

```
┌─────────────────────────┐
│  VuetifyPoC             │  ← AppBar
├─────────────────────────┤
│  [■]    [■]    [■]      │
│  商品   お気に入り 設定  │  ← MenuGrid（アイテムあり）
│  [■]    [■]             │
│  サンプル スキャナー     │  ← 空きセルは非表示（何も描画しない）
│                          │
│ ┌─────────────────────┐ │
│ │   📷  クイックスキャン│ │  ← QuickScannerButton（大型ボタン）
│ └─────────────────────┘ │
├─────────────────────────┤
│  [Home] [Search] [設定] │  ← BottomNavigation
└─────────────────────────┘
```

### QuickScannerButton 仕様

| 項目 | 値 |
|---|---|
| 幅 | グリッドと同じ横パディング（`mx: 24px`）に合わせた全幅 |
| 高さ | 約 160px（`min-height: 160px`） |
| アイコン | `mdi-barcode-scan`、サイズ 48px |
| ラベル | 「クイックスキャン」（`text-subtitle-1 font-weight-bold`） |
| 色 | `color="success" variant="flat"`（Vuetify テーマ変数） |
| 角丸 | `rounded="xl"`（16px） |
| タップ動作 | `router.push('/scanner')` |

---

## コンポーネント構成

```
src/
├── components/
│   └── menu/
│       ├── MenuGridItem.vue      # 変更：空セルの描画を削除
│       ├── MenuGrid.vue          # 変更なし
│       └── QuickScannerButton.vue  # 新規
└── pages/
    └── HomePage.vue              # 変更：QuickScannerButton を追加
```

---

## 変更ファイル詳細

### MenuGridItem.vue（変更）

`item` が undefined のとき、破線枠の `<div>` を返す代わりに空の `<div>` を返す（スタイルなし、ただしグリッドの位置を保持するため `<div>` 自体は残す）。

**変更前:**
```html
<div class="menu-grid-item__tile" :class="{ 'menu-grid-item__tile--empty': !item }">
  <v-icon v-if="item" ... />
</div>
```

**変更後:**
```html
<template v-if="item">
  <div class="menu-grid-item">
    <div class="menu-grid-item__tile">
      <v-icon :icon="item.icon" size="48" color="white" />
    </div>
    <span class="menu-grid-item__label">{{ item.label }}</span>
  </div>
</template>
<div v-else class="menu-grid-item--placeholder" />
```

`.menu-grid-item--placeholder` は `aspect-ratio: 1` のみ（枠なし、背景なし）。

### QuickScannerButton.vue（新規）

```vue
<template>
  <div class="quick-scanner-btn-wrapper">
    <v-btn
      color="success"
      variant="flat"
      rounded="xl"
      class="quick-scanner-btn"
      @click="router.push('/scanner')"
    >
      <div class="quick-scanner-btn__inner">
        <v-icon size="48">mdi-barcode-scan</v-icon>
        <span class="text-subtitle-1 font-weight-bold">クイックスキャン</span>
      </div>
    </v-btn>
  </div>
</template>
```

`.quick-scanner-btn` は `width: 100%`, `min-height: 160px`。

### HomePage.vue（変更）

```vue
<template>
  <MainLayout title="VuetifyPoC">
    <MenuGrid />
    <QuickScannerButton />
  </MainLayout>
</template>
```

---

## スコープ外

- ボタンの表示/非表示カスタマイズ（常時表示）
- ボタン色・ラベルのカスタマイズ
- スキャナーのインライン起動（ページ遷移のみ）
