# スキャン画面パターン 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 連続スキャン＋リスト画面（ScanListPage）とモード切替読み取り画面（ScanModePage）の2画面を新規追加し、既存 ScannerPage は無変更で保つ。

**Architecture:** 各画面に専用 Pinia ストア（scanListStore / scanModeStore）を用意し、呼び出し元は `requestScanList(opts)` / `requestScan(opts)` の1行で画面遷移させる。`useBarcodeScanner` に formats getter を追加してモード切替時のフォーマット指定に対応する。

**Tech Stack:** Vue 3 Composition API / Vuetify 3 / Pinia / Vue Router 4 / @zxing/browser / Vitest + Vue Test Utils

## Global Constraints

- 既存ファイル `ScannerPage.vue` / `scannerStore.ts` / `useBarcodeScanner.ts`（Task 2 の拡張を除く）は変更しない
- `src/types/**` はカバレッジ除外のためテスト不要
- ストアのテストは `src/stores/__tests__/` に配置、ページのテストは `src/pages/__tests__/` に配置
- テスト実行コマンド: `npx vitest run`
- OCR タブは UI のみ実装（実際の文字認識なし）
- `completing` フラグで ZXing 二重コールバック防止（既存 ScannerPage と同パターン）
- `showSnack(color, text)` で通知（useSnackbar の API）

---

### Task 1: 型定義

**Files:**
- Create: `src/types/scanList.ts`
- Create: `src/types/scanMode.ts`

**Interfaces:**
- Produces: `ScanListItem`, `ScanListOptions`, `ScanMode`, `ScanModeOptions`（後続全タスクが参照）

- [ ] **Step 1: `src/types/scanList.ts` を作成**

```ts
export interface ScanListItem {
  id: string
  raw: string
  format: string
  timestamp: number
  resolved?: unknown
  resolving: boolean
  resolveError?: string
}

export interface ScanListOptions {
  title?: string
  confirmLabel?: string
  resolver?: (text: string) => Promise<unknown>
  resolvedLabel?: (resolved: unknown) => string
  onConfirm: (items: ScanListItem[]) => void
}
```

- [ ] **Step 2: `src/types/scanMode.ts` を作成**

```ts
export type ScanMode = 'barcode' | 'qr' | 'ocr'

export interface ScanModeOptions {
  title?: string
  defaultMode?: ScanMode
  resolver?: (text: string) => Promise<unknown>
  onConfirm: (raw: string, resolved?: unknown) => void
}
```

- [ ] **Step 3: コミット**

```bash
git add src/types/scanList.ts src/types/scanMode.ts
git commit -m "feat: ScanListItem / ScanModeOptions 型定義を追加"
```

---

### Task 2: useBarcodeScanner formats getter 拡張

**Files:**
- Modify: `src/composables/useBarcodeScanner.ts`

**Interfaces:**
- Consumes: 既存 `useBarcodeScanner(videoRef, options)` シグネチャ
- Produces: 拡張後 `options.formats?: () => BarcodeFormat[]`（ScanModePage が利用）

- [ ] **Step 1: options インターフェースに `formats` を追加**

`src/composables/useBarcodeScanner.ts` の14〜17行目を以下に置き換える:

```ts
export function useBarcodeScanner(
  videoRef: Ref<HTMLVideoElement | null>,
  options: {
    onScan: (result: ScanResult) => void
    formats?: () => BarcodeFormat[]
  }
) {
```

- [ ] **Step 2: `start()` 内でフォーマットヒントを適用**

`src/composables/useBarcodeScanner.ts` の `start()` 関数内、`hints.set(DecodeHintType.TRY_HARDER, true)` の直後に追加:

```ts
const fmts = options.formats?.()
if (fmts?.length) hints.set(DecodeHintType.POSSIBLE_FORMATS, fmts)
```

- [ ] **Step 3: 既存テストが通ることを確認**

```bash
npx vitest run
```

期待: 全テスト PASS（既存コードへの影響なし）

- [ ] **Step 4: コミット**

```bash
git add src/composables/useBarcodeScanner.ts
git commit -m "feat: useBarcodeScanner に formats getter オプションを追加"
```

---

### Task 3: scanListStore + テスト

**Files:**
- Create: `src/stores/scanListStore.ts`
- Create: `src/stores/__tests__/scanListStore.test.ts`

**Interfaces:**
- Consumes: `ScanListItem`, `ScanListOptions`（Task 1）、`@/router`
- Produces: `useScanListStore()` — `{ options, requestScanList, complete, cancel }`

- [ ] **Step 1: テストファイルを作成（失敗を確認する）**

`src/stores/__tests__/scanListStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useScanListStore } from '../scanListStore'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

import router from '@/router'

describe('useScanListStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requestScanList: オプションを保存して /scan-list に遷移する', () => {
    const store = useScanListStore()
    const onConfirm = vi.fn()
    store.requestScanList({ title: 'テスト', onConfirm })
    expect(store.options?.title).toBe('テスト')
    expect(router.push).toHaveBeenCalledWith('/scan-list')
  })

  it('complete: onConfirm にアイテムを渡して router.back()', () => {
    const store = useScanListStore()
    const onConfirm = vi.fn()
    store.requestScanList({ onConfirm })
    const items = [{ id: '1-0', raw: 'abc', format: 'QR_CODE', timestamp: 1, resolving: false }]
    store.complete(items)
    expect(onConfirm).toHaveBeenCalledWith(items)
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })

  it('cancel: onConfirm を呼ばずに router.back()', () => {
    const store = useScanListStore()
    const onConfirm = vi.fn()
    store.requestScanList({ onConfirm })
    store.cancel()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })

  it('complete: requestScanList 前に呼んでも crash しない', () => {
    const store = useScanListStore()
    expect(() => store.complete([])).not.toThrow()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/stores/__tests__/scanListStore.test.ts
```

期待: `Cannot find module '../scanListStore'` エラー

- [ ] **Step 3: `src/stores/scanListStore.ts` を作成**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'
import type { ScanListItem, ScanListOptions } from '@/types/scanList'

export const useScanListStore = defineStore('scanList', () => {
  const options = ref<ScanListOptions | null>(null)

  function requestScanList(opts: ScanListOptions) {
    options.value = opts
    router.push('/scan-list')
  }

  function complete(items: ScanListItem[]) {
    options.value?.onConfirm(items)
    options.value = null
    router.back()
  }

  function cancel() {
    options.value = null
    router.back()
  }

  return { options, requestScanList, complete, cancel }
})
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/stores/__tests__/scanListStore.test.ts
```

期待: 4件 PASS

- [ ] **Step 5: コミット**

```bash
git add src/stores/scanListStore.ts src/stores/__tests__/scanListStore.test.ts
git commit -m "feat: scanListStore を追加"
```

---

### Task 4: scanModeStore + テスト

**Files:**
- Create: `src/stores/scanModeStore.ts`
- Create: `src/stores/__tests__/scanModeStore.test.ts`

**Interfaces:**
- Consumes: `ScanModeOptions`（Task 1）、`@/router`
- Produces: `useScanModeStore()` — `{ options, requestScan, complete, cancel }`

- [ ] **Step 1: テストファイルを作成（失敗を確認する）**

`src/stores/__tests__/scanModeStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useScanModeStore } from '../scanModeStore'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

import router from '@/router'

describe('useScanModeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requestScan: オプションを保存して /scan-mode に遷移する', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ title: '商品バーコード', defaultMode: 'barcode', onConfirm })
    expect(store.options?.title).toBe('商品バーコード')
    expect(store.options?.defaultMode).toBe('barcode')
    expect(router.push).toHaveBeenCalledWith('/scan-mode')
  })

  it('complete: raw と resolved を onConfirm に渡して router.back()', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ onConfirm })
    store.complete('4901234567890', { name: 'りんごジュース' })
    expect(onConfirm).toHaveBeenCalledWith('4901234567890', { name: 'りんごジュース' })
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })

  it('complete: resolver なしで生値のみ返却', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ onConfirm })
    store.complete('4901234567890')
    expect(onConfirm).toHaveBeenCalledWith('4901234567890', undefined)
  })

  it('cancel: onConfirm を呼ばずに router.back()', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ onConfirm })
    store.cancel()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/stores/__tests__/scanModeStore.test.ts
```

期待: `Cannot find module '../scanModeStore'` エラー

- [ ] **Step 3: `src/stores/scanModeStore.ts` を作成**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'
import type { ScanModeOptions } from '@/types/scanMode'

export const useScanModeStore = defineStore('scanMode', () => {
  const options = ref<ScanModeOptions | null>(null)

  function requestScan(opts: ScanModeOptions) {
    options.value = opts
    router.push('/scan-mode')
  }

  function complete(raw: string, resolved?: unknown) {
    options.value?.onConfirm(raw, resolved)
    options.value = null
    router.back()
  }

  function cancel() {
    options.value = null
    router.back()
  }

  return { options, requestScan, complete, cancel }
})
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/stores/__tests__/scanModeStore.test.ts
```

期待: 4件 PASS

- [ ] **Step 5: コミット**

```bash
git add src/stores/scanModeStore.ts src/stores/__tests__/scanModeStore.test.ts
git commit -m "feat: scanModeStore を追加"
```

---

### Task 5: ルート追加

**Files:**
- Modify: `src/router/index.ts`

**Interfaces:**
- Consumes: `ScanListPage.vue`, `ScanModePage.vue`（Task 6・7 で作成）
- Produces: `/scan-list` → ScanListPage、`/scan-mode` → ScanModePage

- [ ] **Step 1: 2ルートを追加**

`src/router/index.ts` の `{ path: '/:pathMatch(.*)*', ... }` の直前に挿入:

```ts
{ path: '/scan-list', component: () => import('@/pages/ScanListPage.vue') },
{ path: '/scan-mode', component: () => import('@/pages/ScanModePage.vue') },
```

- [ ] **Step 2: コミット**

```bash
git add src/router/index.ts
git commit -m "feat: /scan-list / /scan-mode ルートを追加"
```

---

### Task 6: ScanListPage

**Files:**
- Create: `src/pages/ScanListPage.vue`
- Create: `src/pages/__tests__/ScanListPage.test.ts`

**Interfaces:**
- Consumes: `useScanListStore`（Task 3）、`useBarcodeScanner`（Task 2）、`ScanListItem`（Task 1）
- Produces: `/scan-list` の画面実装

- [ ] **Step 1: テストファイルを作成**

`src/pages/__tests__/ScanListPage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanListPage from '../ScanListPage.vue'
import { useScanListStore } from '@/stores/scanListStore'
import type { ScanResult } from '@/types/scanner'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

let capturedOnScan: ((result: ScanResult) => void) | null = null
const mockStop = vi.fn()
const mockStart = vi.fn()

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: mockStart,
      stop: mockStop,
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

function mountPage(storeOpts = {}) {
  const store = useScanListStore()
  store.requestScanList({ onConfirm: vi.fn(), ...storeOpts })
  return mount(ScanListPage, {
    global: { stubs: { teleport: true } },
  })
}

describe('ScanListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('マウント時に start() が呼ばれる', () => {
    mountPage()
    expect(mockStart).toHaveBeenCalled()
  })

  it('スキャンするとリストにアイテムが追加される', async () => {
    const wrapper = mountPage()
    capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('4901234567890')
  })

  it('× ボタンでアイテムを削除できる', async () => {
    const wrapper = mountPage()
    capturedOnScan!({ text: 'item1', format: 'QR_CODE', timestamp: 1 })
    await wrapper.vm.$nextTick()
    const closeBtn = wrapper.find('button[aria-label], .v-btn')
    // mdi-close ボタンをクリック
    const btns = wrapper.findAll('.v-btn')
    const closeBtn2 = btns[btns.length - 1]
    await closeBtn2.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('item1')
  })

  it('確定ボタンで store.complete が呼ばれる', async () => {
    const onConfirm = vi.fn()
    const wrapper = mountPage({ onConfirm })
    capturedOnScan!({ text: 'abc', format: 'QR_CODE', timestamp: 1 })
    await wrapper.vm.$nextTick()
    const store = useScanListStore()
    const completeSpy = vi.spyOn(store, 'complete')
    // 確定ボタン（最後の v-btn）をクリック
    const btns = wrapper.findAll('.v-btn')
    await btns[btns.length - 1].trigger('click')
    expect(completeSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/pages/__tests__/ScanListPage.test.ts
```

期待: `Cannot find module '../ScanListPage.vue'` エラー

- [ ] **Step 3: `src/pages/ScanListPage.vue` を作成**

```vue
<template>
  <v-layout>
    <div class="d-flex flex-column" style="width: 100%; height: 100dvh; background: #000; overflow: hidden;">

      <!-- ツールバー -->
      <div
        class="d-flex align-center px-3"
        style="height: 52px; background: rgba(0,0,0,0.75); flex-shrink: 0;"
      >
        <v-btn icon variant="text" color="white" size="small" @click="store.cancel()">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="flex-1-1 text-center text-white text-body-1 font-weight-bold">
          {{ store.options?.title ?? '連続スキャン' }}
        </span>
        <div style="width: 36px;" />
      </div>

      <!-- カメラエリア -->
      <div
        class="position-relative d-flex align-center justify-center"
        style="height: 45%; flex-shrink: 0;"
      >
        <video
          ref="videoRef"
          muted
          playsinline
          style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;"
        />
        <div class="scanner-frame" aria-hidden="true">
          <div class="corner tl" /><div class="corner tr" />
          <div class="corner bl" /><div class="corner br" />
          <div class="scanline" />
        </div>
        <div
          v-if="error"
          class="d-flex flex-column align-center justify-center pa-4"
          style="position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 2;"
        >
          <v-icon color="error" size="52">mdi-camera-off</v-icon>
          <p class="text-white text-center mt-4 text-body-2">{{ error }}</p>
        </div>
      </div>

      <!-- DEV モック入力 -->
      <div
        v-if="isDev"
        class="d-flex align-center gap-2 px-3 py-2"
        style="background: rgba(255,165,0,0.15); border-top: 1px solid rgba(255,165,0,0.4); flex-shrink: 0;"
      >
        <v-text-field
          v-model="mockValue"
          label="DEV: モック入力"
          density="compact"
          variant="outlined"
          hide-details
          bg-color="#1a1a1a"
          style="flex: 1;"
          @keydown.enter="onMockScan"
        />
        <v-btn color="orange" variant="elevated" size="small" @click="onMockScan">確定</v-btn>
      </div>

      <!-- スキャン済みリスト -->
      <div style="flex: 1; overflow-y: auto; background: #111;">
        <p class="text-caption text-medium-emphasis pa-2 pb-1">
          スキャン済み（{{ items.length }}件）
        </p>
        <v-list density="compact" bg-color="transparent">
          <v-list-item
            v-for="item in items"
            :key="item.id"
          >
            <template #title>
              <span class="text-white text-body-2">{{ item.raw }}</span>
            </template>
            <template #subtitle>
              <span v-if="item.resolving" class="text-medium-emphasis text-caption">⏳ 解決中...</span>
              <span v-else-if="item.resolveError" class="text-error text-caption">❌ {{ item.resolveError }}</span>
              <span v-else-if="item.resolved !== undefined" class="text-success text-caption">
                {{ displayResolved(item.resolved) }}
              </span>
              <span v-else class="text-medium-emphasis text-caption">{{ item.format }}</span>
            </template>
            <template #append>
              <v-btn icon size="x-small" variant="text" color="white" @click="removeItem(item.id)">
                <v-icon size="16">mdi-close</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <!-- フッター -->
      <div
        class="d-flex align-center gap-2 pa-2"
        style="background: rgba(0,0,0,0.85); flex-shrink: 0;"
      >
        <v-btn
          color="error"
          variant="text"
          size="small"
          prepend-icon="mdi-delete-outline"
          @click="items = []"
        >クリア</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          style="flex: 1;"
          :disabled="items.length === 0"
          @click="onComplete"
        >
          {{ store.options?.confirmLabel ?? '確定' }}（{{ items.length }}件）
        </v-btn>
      </div>

    </div>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useScanListStore } from '@/stores/scanListStore'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanListItem } from '@/types/scanList'

const isDev = import.meta.env.DEV
const store = useScanListStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const items = ref<ScanListItem[]>([])
const mockValue = ref('')
let itemIndex = 0
let completing = false

const { start, stop, error } = useBarcodeScanner(videoRef, {
  onScan(result) {
    addItem(result.text, result.format)
  },
})

function addItem(text: string, format: string) {
  const id = `${Date.now()}-${itemIndex++}`
  const item: ScanListItem = { id, raw: text, format, timestamp: Date.now(), resolving: false }
  items.value.push(item)

  const resolver = store.options?.resolver
  if (!resolver) return

  item.resolving = true
  resolver(text)
    .then((resolved) => {
      item.resolved = resolved
      item.resolving = false
    })
    .catch((e) => {
      item.resolveError = e instanceof Error ? e.message : '取得失敗'
      item.resolving = false
    })
}

function removeItem(id: string) {
  items.value = items.value.filter((i) => i.id !== id)
}

function displayResolved(resolved: unknown): string {
  const labelFn = store.options?.resolvedLabel
  if (labelFn) return labelFn(resolved)
  if (typeof resolved === 'string') return resolved
  return JSON.stringify(resolved)
}

function onComplete() {
  if (completing) return
  completing = true
  stop()
  store.complete([...items.value])
}

function onMockScan() {
  if (!mockValue.value.trim() || completing) return
  addItem(mockValue.value.trim(), 'MOCK')
  mockValue.value = ''
}

onMounted(start)
onUnmounted(stop)
</script>

<style scoped>
.scanner-frame {
  position: absolute;
  width: 230px;
  height: 230px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
}
.corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border-color: #00e676;
  border-style: solid;
}
.corner.tl { top: 0;    left: 0;  border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.corner.tr { top: 0;    right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0; left: 0;  border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
.scanline {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 50%;
  height: 2px;
  background: linear-gradient(to right, transparent, #f44336, transparent);
  box-shadow: 0 0 6px #f44336;
}
</style>
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/pages/__tests__/ScanListPage.test.ts
```

期待: 4件 PASS

- [ ] **Step 5: コミット**

```bash
git add src/pages/ScanListPage.vue src/pages/__tests__/ScanListPage.test.ts
git commit -m "feat: ScanListPage（連続スキャン＋リスト）を追加"
```

---

### Task 7: ScanModePage

**Files:**
- Create: `src/pages/ScanModePage.vue`
- Create: `src/pages/__tests__/ScanModePage.test.ts`

**Interfaces:**
- Consumes: `useScanModeStore`（Task 4）、`useBarcodeScanner`（Task 2）、`ScanMode`（Task 1）、`useSnackbar`（既存）
- Produces: `/scan-mode` の画面実装

- [ ] **Step 1: テストファイルを作成**

`src/pages/__tests__/ScanModePage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanModePage from '../ScanModePage.vue'
import { useScanModeStore } from '@/stores/scanModeStore'
import type { ScanResult } from '@/types/scanner'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

let capturedOnScan: ((result: ScanResult) => void) | null = null
let capturedFormatsGetter: (() => unknown) | null = null
const mockStop = vi.fn()
const mockStart = vi.fn()

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((videoRef, options) => {
    capturedOnScan = options.onScan
    capturedFormatsGetter = options.formats ?? null
    return {
      start: mockStart,
      stop: mockStop,
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

function mountPage(storeOpts = {}) {
  const store = useScanModeStore()
  store.requestScan({ onConfirm: vi.fn(), ...storeOpts })
  return mount(ScanModePage, {
    global: { stubs: { teleport: true } },
  })
}

describe('ScanModePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
    capturedFormatsGetter = null
  })

  it('マウント時に start() が呼ばれる', () => {
    mountPage()
    expect(mockStart).toHaveBeenCalled()
  })

  it('resolver なし: スキャン後 store.complete(raw, undefined) が呼ばれる', async () => {
    const onConfirm = vi.fn()
    mountPage({ onConfirm })
    const store = useScanModeStore()
    const completeSpy = vi.spyOn(store, 'complete')
    await capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(completeSpy).toHaveBeenCalledWith('4901234567890', undefined)
  })

  it('resolver あり: 成功時 store.complete(raw, resolved) が呼ばれる', async () => {
    const resolver = vi.fn().mockResolvedValue({ name: 'りんごジュース' })
    const onConfirm = vi.fn()
    mountPage({ resolver, onConfirm })
    const store = useScanModeStore()
    const completeSpy = vi.spyOn(store, 'complete')
    await capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(completeSpy).toHaveBeenCalledWith('4901234567890', { name: 'りんごジュース' })
  })

  it('barcode モードの formats getter は 1D バーコードフォーマットを返す', () => {
    mountPage({ defaultMode: 'barcode' })
    const fmts = capturedFormatsGetter?.() as unknown[]
    expect(fmts?.length).toBeGreaterThan(0)
  })

  it('qr モードの formats getter は QR_CODE のみを返す', async () => {
    const wrapper = mountPage({ defaultMode: 'qr' })
    // v-tabs で qr タブをクリック
    const tabs = wrapper.findAll('.v-tab')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    // formats getter は qr モード時に QR_CODE のみ
    // BarcodeFormat.QR_CODE = 11 (数値)
    const fmts = capturedFormatsGetter?.() as number[]
    expect(fmts?.length).toBe(1)
  })

  it('OCR タブ選択時に「準備中」テキストが表示される', async () => {
    const wrapper = mountPage()
    const tabs = wrapper.findAll('.v-tab')
    await tabs[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('準備中')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx vitest run src/pages/__tests__/ScanModePage.test.ts
```

期待: `Cannot find module '../ScanModePage.vue'` エラー

- [ ] **Step 3: `src/pages/ScanModePage.vue` を作成**

```vue
<template>
  <v-layout>
    <div class="d-flex flex-column" style="width: 100%; height: 100dvh; background: #000; overflow: hidden;">

      <!-- ツールバー -->
      <div
        class="d-flex align-center px-3"
        style="height: 52px; background: rgba(0,0,0,0.75); flex-shrink: 0;"
      >
        <v-btn icon variant="text" color="white" size="small" @click="store.cancel()">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="flex-1-1 text-center text-white text-body-1 font-weight-bold">
          {{ store.options?.title ?? 'バーコード読み取り' }}
        </span>
        <v-btn
          icon
          variant="text"
          :color="torchOn ? 'yellow-darken-1' : 'white'"
          size="small"
          :disabled="!torchAvailable || scanMode === 'ocr'"
          @click="onToggleTorch"
        >
          <v-icon>{{ torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight' }}</v-icon>
        </v-btn>
      </div>

      <!-- モードタブ -->
      <v-tabs
        v-model="scanMode"
        bg-color="rgba(0,0,0,0.75)"
        color="primary"
        density="compact"
        style="flex-shrink: 0;"
      >
        <v-tab value="barcode">バーコード</v-tab>
        <v-tab value="qr">QR</v-tab>
        <v-tab value="ocr">OCR</v-tab>
      </v-tabs>

      <!-- カメラ / OCR プレースホルダー -->
      <div class="position-relative d-flex align-center justify-center" style="flex: 1;">

        <template v-if="scanMode === 'ocr'">
          <div class="d-flex flex-column align-center justify-center" style="color: white;">
            <v-icon size="64" color="grey-darken-1">mdi-text-recognition</v-icon>
            <p class="mt-4 text-body-2 text-medium-emphasis">OCR 機能は準備中です</p>
          </div>
        </template>

        <template v-else>
          <video
            ref="videoRef"
            muted
            playsinline
            style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;"
          />
          <div class="scanner-frame" aria-hidden="true">
            <div class="corner tl" /><div class="corner tr" />
            <div class="corner bl" /><div class="corner br" />
            <div class="scanline" />
          </div>
          <div
            v-if="error"
            class="d-flex flex-column align-center justify-center pa-4"
            style="position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 2;"
          >
            <v-icon color="error" size="52">mdi-camera-off</v-icon>
            <p class="text-white text-center mt-4 text-body-2">{{ error }}</p>
          </div>
          <div
            v-if="resolving"
            class="d-flex flex-column align-center justify-center"
            style="position: absolute; inset: 0; background: rgba(0,0,0,0.8); z-index: 3;"
          >
            <v-progress-circular indeterminate color="primary" size="48" />
            <p class="text-white mt-4 text-body-2">解決中...</p>
          </div>
        </template>
      </div>

      <!-- DEV モック入力 -->
      <div
        v-if="isDev && scanMode !== 'ocr'"
        class="d-flex align-center gap-2 px-3 py-2"
        style="background: rgba(255,165,0,0.15); border-top: 1px solid rgba(255,165,0,0.4); flex-shrink: 0;"
      >
        <v-text-field
          v-model="mockValue"
          label="DEV: モック入力"
          density="compact"
          variant="outlined"
          hide-details
          bg-color="#1a1a1a"
          style="flex: 1;"
          @keydown.enter="onMockScan"
        />
        <v-btn color="orange" variant="elevated" size="small" @click="onMockScan">確定</v-btn>
      </div>

    </div>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { BarcodeFormat } from '@zxing/browser'
import { useScanModeStore } from '@/stores/scanModeStore'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import { useSnackbar } from '@/composables/useSnackbar'
import type { ScanMode } from '@/types/scanMode'
import type { ScanResult } from '@/types/scanner'

const isDev = import.meta.env.DEV
const store = useScanModeStore()
const { showSnack } = useSnackbar()
const videoRef = ref<HTMLVideoElement | null>(null)
const scanMode = ref<ScanMode>(store.options?.defaultMode ?? 'barcode')
const torchOn = ref(false)
const resolving = ref(false)
const mockValue = ref('')
let completing = false

const MODE_FORMATS: Record<Exclude<ScanMode, 'ocr'>, BarcodeFormat[]> = {
  barcode: [
    BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_39,
  ],
  qr: [BarcodeFormat.QR_CODE],
}

const { start, stop, error, torchAvailable, switchTorch } = useBarcodeScanner(videoRef, {
  onScan: handleScan,
  formats: () => scanMode.value !== 'ocr' ? MODE_FORMATS[scanMode.value] : [],
})

async function handleScan(result: ScanResult) {
  if (completing) return
  completing = true
  stop()

  const resolver = store.options?.resolver
  if (!resolver) {
    store.complete(result.text)
    return
  }

  resolving.value = true
  try {
    const resolved = await resolver(result.text)
    store.complete(result.text, resolved)
  } catch (e) {
    resolving.value = false
    completing = false
    showSnack('error', e instanceof Error ? e.message : '取得に失敗しました')
    start()
  }
}

async function onMockScan() {
  if (!mockValue.value.trim() || completing) return
  const text = mockValue.value.trim()
  mockValue.value = ''
  await handleScan({ text, format: 'MOCK', timestamp: Date.now() })
}

async function onToggleTorch() {
  torchOn.value = !torchOn.value
  await switchTorch(torchOn.value)
}

watch(scanMode, async () => {
  stop()
  torchOn.value = false
  if (scanMode.value !== 'ocr') {
    await nextTick()
    start()
  }
})

onMounted(start)
onUnmounted(stop)
</script>

<style scoped>
.scanner-frame {
  position: absolute;
  width: 230px;
  height: 230px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
}
.corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border-color: #00e676;
  border-style: solid;
}
.corner.tl { top: 0;    left: 0;  border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.corner.tr { top: 0;    right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0; left: 0;  border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
.scanline {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 50%;
  height: 2px;
  background: linear-gradient(to right, transparent, #f44336, transparent);
  box-shadow: 0 0 6px #f44336;
}
</style>
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx vitest run src/pages/__tests__/ScanModePage.test.ts
```

期待: 5件 PASS

- [ ] **Step 5: 全テストが通ることを確認**

```bash
npx vitest run
```

期待: 全件 PASS

- [ ] **Step 6: コミット**

```bash
git add src/pages/ScanModePage.vue src/pages/__tests__/ScanModePage.test.ts
git commit -m "feat: ScanModePage（バーコード/QR/OCRモード切替）を追加"
```
