# FlowStepper 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 検索→一覧→詳細の遷移フローを可視化する表示専用ステッパーコンポーネントを作り、3ページに組み込む。

**Architecture:** `FlowStepper.vue` は `step`（現在ステップ番号）と `steps`（ラベル配列）を props で受け取り、各ステップの状態（完了・現在・未来）を視覚的に表示する。ルーターやストアへの依存はなく、表示ロジックのみを持つ。各ページはコンテンツ先頭に `<FlowStepper :step="N" />` を追加するだけで組み込み完了。

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Vuetify 3 (`v-icon`, `v-divider`), Vitest + Vue Test Utils

## Global Constraints

- `step` は 1 始まりの整数。`steps` のデフォルトは `['検索', '一覧', '詳細']`
- 表示専用（クリック・ナビゲーション動作なし）
- 高さ 40px 固定、背景 `rgb(var(--v-theme-background))`
- ProductListPage は既存の `.list-header`（sticky）内の先頭に配置する
- SearchPage・DetailPage はコンテンツ先頭（`<v-container>` の前）に配置する

---

### Task 1: FlowStepper コンポーネント + テスト

**Files:**
- Create: `src/components/ui/FlowStepper.vue`
- Create: `src/components/ui/__tests__/FlowStepper.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/components/ui/FlowStepper.vue
  defineProps<{
    step: number          // 現在のステップ（1始まり）
    steps?: string[]      // デフォルト: ['検索', '一覧', '詳細']
  }>()
  // emits なし
  ```

- [ ] **Step 1: テストファイルを作成して失敗させる**

`src/components/ui/__tests__/FlowStepper.test.ts` を作成:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlowStepper from '../FlowStepper.vue'

function mountStepper(props: { step: number; steps?: string[] }) {
  return mount(FlowStepper, { props })
}

describe('FlowStepper', () => {
  it('デフォルトラベルを3つ表示する', () => {
    const w = mountStepper({ step: 1 })
    expect(w.text()).toContain('検索')
    expect(w.text()).toContain('一覧')
    expect(w.text()).toContain('詳細')
  })

  it('step=1 のとき完了チェックアイコンが0個', () => {
    const w = mountStepper({ step: 1 })
    expect(w.findAll('.step-done').length).toBe(0)
  })

  it('step=2 のとき完了ステップが1個', () => {
    const w = mountStepper({ step: 2 })
    expect(w.findAll('.step-done').length).toBe(1)
  })

  it('step=3 のとき完了ステップが2個', () => {
    const w = mountStepper({ step: 3 })
    expect(w.findAll('.step-done').length).toBe(2)
  })

  it('カスタム steps を表示できる', () => {
    const w = mountStepper({ step: 1, steps: ['入力', '確認', '完了'] })
    expect(w.text()).toContain('入力')
    expect(w.text()).toContain('確認')
    expect(w.text()).toContain('完了')
    expect(w.text()).not.toContain('検索')
  })

  it('step=0 のとき全ステップが未来状態', () => {
    const w = mountStepper({ step: 0 })
    expect(w.findAll('.step-done').length).toBe(0)
    expect(w.findAll('.step-current').length).toBe(0)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/components/ui/__tests__/FlowStepper.test.ts
```
Expected: FAIL（FlowStepper.vue が存在しないためインポートエラー）

- [ ] **Step 3: FlowStepper.vue を実装する**

`src/components/ui/FlowStepper.vue` を作成:

```vue
<template>
  <div class="flow-stepper">
    <template v-for="(label, i) in steps" :key="i">
      <div
        class="step-item"
        :class="{
          'step-done': isDone(i + 1),
          'step-current': isCurrent(i + 1),
          'step-future': isFuture(i + 1),
        }"
      >
        <div class="step-circle">
          <v-icon v-if="isDone(i + 1)" size="12" color="white">mdi-check</v-icon>
          <span v-else class="step-num">{{ i + 1 }}</span>
        </div>
        <span class="step-label">{{ label }}</span>
      </div>
      <div
        v-if="i < steps.length - 1"
        class="step-line"
        :class="isDone(i + 1) ? 'line-done' : 'line-future'"
      />
    </template>
  </div>
  <v-divider />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    step: number
    steps?: string[]
  }>(),
  { steps: () => ['検索', '一覧', '詳細'] },
)

const isDone    = (n: number) => n < props.step
const isCurrent = (n: number) => n === props.step
const isFuture  = (n: number) => n > props.step
</script>

<style scoped>
.flow-stepper {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  height: 40px;
  background: rgb(var(--v-theme-background));
}

.step-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.step-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-done .step-circle,
.step-current .step-circle {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.step-future .step-circle {
  border: 2px solid rgba(var(--v-theme-on-surface), 0.24);
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.step-num {
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
}

.step-label {
  font-size: 12px;
  white-space: nowrap;
}

.step-current .step-label {
  font-weight: bold;
}

.step-future .step-label {
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.step-line {
  flex: 1;
  height: 2px;
  min-width: 12px;
}

.line-done   { background: rgb(var(--v-theme-primary)); }
.line-future { background: rgba(var(--v-theme-on-surface), 0.12); }
</style>
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/components/ui/__tests__/FlowStepper.test.ts
```
Expected: 6/6 PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/ui/FlowStepper.vue src/components/ui/__tests__/FlowStepper.test.ts
git commit -m "feat: FlowStepper コンポーネントを追加（表示専用ステッパー）"
```

---

### Task 2: 3ページへの組み込み

**Files:**
- Modify: `src/pages/SearchPage.vue`
- Modify: `src/pages/ProductListPage.vue`
- Modify: `src/pages/DetailPage.vue`

**Interfaces:**
- Consumes: `FlowStepper.vue`（Task 1 で作成）
  ```vue
  <FlowStepper :step="N" />
  ```

**SearchPage への組み込み**

`src/pages/SearchPage.vue` の `<v-container class="pb-6">` の直前に追加:

変更前:
```vue
  <MainLayout title="商品検索" :footer-actions="footerActions">
    <template #prepend>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <v-container class="pb-6">
```

変更後:
```vue
  <MainLayout title="商品検索" :footer-actions="footerActions">
    <template #prepend>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <FlowStepper :step="1" />
    <v-container class="pb-6">
```

`<script setup>` に import を追加:
```ts
import FlowStepper from '@/components/ui/FlowStepper.vue'
```

**ProductListPage への組み込み**

`src/pages/ProductListPage.vue` の `<div class="list-header">` の先頭に追加:

変更前:
```vue
    <div class="list-header">
      <!-- 検索条件 -->
      <div class="px-4 pt-3 pb-2">
```

変更後:
```vue
    <div class="list-header">
      <FlowStepper :step="2" />
      <!-- 検索条件 -->
      <div class="px-4 pt-3 pb-2">
```

`<script setup>` に import を追加:
```ts
import FlowStepper from '@/components/ui/FlowStepper.vue'
```

**DetailPage への組み込み**

`src/pages/DetailPage.vue` の `<v-container v-if="product"` の直前に追加:

変更前:
```vue
  <SubLayout :title="product?.name ?? '詳細'">
    <template #footer>
      ...
    </template>

    <v-container v-if="product" class="pb-6">
```

変更後:
```vue
  <SubLayout :title="product?.name ?? '詳細'">
    <template #footer>
      ...
    </template>

    <FlowStepper :step="3" />
    <v-container v-if="product" class="pb-6">
```

`<script setup>` に import を追加:
```ts
import FlowStepper from '@/components/ui/FlowStepper.vue'
```

- [ ] **Step 1: 3ページに FlowStepper を組み込む**

上記3ファイルの変更を適用する。

- [ ] **Step 2: 型チェックを実行**

```bash
npx vue-tsc --noEmit
```
Expected: エラーなし

- [ ] **Step 3: 全テストを実行**

```bash
npx vitest run
```
Expected: FlowStepper の6テストを含む全テストが PASS（ProductCard.test.ts の既存失敗1件は無視）

- [ ] **Step 4: コミット**

```bash
git add src/pages/SearchPage.vue src/pages/ProductListPage.vue src/pages/DetailPage.vue
git commit -m "feat: SearchPage・ProductListPage・DetailPage に FlowStepper を組み込み"
```
