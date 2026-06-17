# クイックスキャナーボタン実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム画面のメニューグリッド下にクイックスキャンボタンを追加し、空きグリッドセルの破線枠を非表示にする。

**Architecture:** `MenuGridItem.vue` の空セル描画を削除してプレースホルダーに差し替え、新規 `QuickScannerButton.vue` をホーム画面に追加するだけのシンプルな2ファイル変更＋1ファイル新規作成。

**Tech Stack:** Vue 3.5 (Composition API + `<script setup>`), Vuetify 4.0 (`v-btn`, `v-icon`), Vue Router 4

---

## ファイル構成

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/components/menu/MenuGridItem.vue` | 変更 | 空セルの破線枠をプレースホルダーに差し替え |
| `src/components/menu/QuickScannerButton.vue` | 新規 | クイックスキャンボタン |
| `src/pages/HomePage.vue` | 変更 | QuickScannerButton をグリッド下に追加 |

---

### Task 1: MenuGridItem.vue — 空セル非表示

**Files:**
- Modify: `src/components/menu/MenuGridItem.vue`

現在の `MenuGridItem.vue` の内容:

```vue
<template>
  <div
    class="menu-grid-item"
    :class="{ 'menu-grid-item--clickable': !!item }"
    @click="item && emit('click')"
  >
    <div class="menu-grid-item__tile" :class="{ 'menu-grid-item__tile--empty': !item }">
      <v-icon v-if="item" :icon="item.icon" size="48" color="white" />
    </div>
    <span v-if="item" class="menu-grid-item__label">{{ item.label }}</span>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from '@/stores/menuStore'

defineProps<{ item?: MenuItem }>()
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.menu-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.menu-grid-item--clickable {
  cursor: pointer;
}
.menu-grid-item__tile {
  width: 80px;
  height: 80px;
  background: rgb(var(--v-theme-primary));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-grid-item__tile--empty {
  background: transparent;
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.15);
}
.menu-grid-item__label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-background));
  text-align: center;
  line-height: 1.3;
  max-width: 88px;
  word-break: break-all;
}
</style>
```

- [ ] **Step 1: ファイルを読み込む**

`src/components/menu/MenuGridItem.vue` を Read ツールで読む。

- [ ] **Step 2: テンプレートを書き換える**

`item` がある場合はアイコン＋ラベルを表示し、ない場合は `aspect-ratio:1` の透明プレースホルダーだけを返すよう変更する。完全な新コード:

```vue
<template>
  <template v-if="item">
    <div
      class="menu-grid-item menu-grid-item--clickable"
      @click="emit('click')"
    >
      <div class="menu-grid-item__tile">
        <v-icon :icon="item.icon" size="48" color="white" />
      </div>
      <span class="menu-grid-item__label">{{ item.label }}</span>
    </div>
  </template>
  <div v-else class="menu-grid-item--placeholder" />
</template>

<script setup lang="ts">
import type { MenuItem } from '@/stores/menuStore'

defineProps<{ item?: MenuItem }>()
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.menu-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.menu-grid-item--clickable {
  cursor: pointer;
}
.menu-grid-item__tile {
  width: 80px;
  height: 80px;
  background: rgb(var(--v-theme-primary));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-grid-item__label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-background));
  text-align: center;
  line-height: 1.3;
  max-width: 88px;
  word-break: break-all;
}
.menu-grid-item--placeholder {
  aspect-ratio: 1;
}
</style>
```

- [ ] **Step 3: 型チェック**

```bash
npm run type-check
```

エラーなし（0 errors）であること。

- [ ] **Step 4: コミット**

```bash
git add src/components/menu/MenuGridItem.vue
git commit -m "fix(menu): hide empty grid cell borders"
```

---

### Task 2: QuickScannerButton.vue — 新規作成

**Files:**
- Create: `src/components/menu/QuickScannerButton.vue`

- [ ] **Step 1: ファイルを作成する**

```vue
<template>
  <div class="quick-scanner-wrapper">
    <v-btn
      color="success"
      variant="flat"
      rounded="xl"
      class="quick-scanner-btn"
      @click="router.push('/scanner')"
    >
      <div class="quick-scanner-btn__inner">
        <v-icon size="48">mdi-barcode-scan</v-icon>
        <span class="text-subtitle-1 font-weight-bold mt-2">クイックスキャン</span>
      </div>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.quick-scanner-wrapper {
  padding: 0 24px 28px;
}
.quick-scanner-btn {
  width: 100%;
  min-height: 160px;
}
.quick-scanner-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
}
</style>
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check
```

エラーなし（0 errors）であること。

- [ ] **Step 3: コミット**

```bash
git add src/components/menu/QuickScannerButton.vue
git commit -m "feat(menu): add QuickScannerButton component"
```

---

### Task 3: HomePage.vue — QuickScannerButton を追加

**Files:**
- Modify: `src/pages/HomePage.vue`

現在の `HomePage.vue` の内容:

```vue
<template>
  <MainLayout title="VuetifyPoC">
    <MenuGrid />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import MenuGrid from '@/components/menu/MenuGrid.vue'
</script>
```

- [ ] **Step 1: ファイルを読み込む**

`src/pages/HomePage.vue` を Read ツールで読む。

- [ ] **Step 2: QuickScannerButton を追加する**

`import` に `QuickScannerButton` を追加し、テンプレートに `<QuickScannerButton />` を `<MenuGrid />` の直後に追加する。完全な新コード:

```vue
<template>
  <MainLayout title="VuetifyPoC">
    <MenuGrid />
    <QuickScannerButton />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import MenuGrid from '@/components/menu/MenuGrid.vue'
import QuickScannerButton from '@/components/menu/QuickScannerButton.vue'
</script>
```

- [ ] **Step 3: 型チェック**

```bash
npm run type-check
```

エラーなし（0 errors）であること。

- [ ] **Step 4: コミット**

```bash
git add src/pages/HomePage.vue
git commit -m "feat(home): add QuickScannerButton to home screen"
```
