# sample/scan 種別フッター移動+OCR 確認・修正実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** QR/バーコード/OCR タブを廃止してフッターのメニューボタンに集約し、OCR 読取を全パターンで確認・手動修正可能にする。

**Architecture:** 新部品3つ(`ScanTypeMenuButton`=フッター種別メニュー、`ScanValueEditForm`=値+項目編集フォーム、`ScanOcrConfirmDialog`=連続系 OCR 確認)を props/emits のみで作り、`useScanScreen` に `pendingOcrItem`/`confirmOcr`/`discardOcr` を追加。連続系は OCR シャッターごとに確認ダイアログを挟み、単発系は結果画面で `format === 'OCR'` のとき編集フォームに差し替える。

**Tech Stack:** Vue 3 (`<script setup>` + TS) / Vuetify 3 / vitest + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-07-30-scan-type-footer-ocr-edit-design.md`

## Global Constraints

- 対象は `src/sample/scan/` のみ。既存 ScannerPage/ScanModePage 系・共有 composable は変更しない
- 部品は props/emits のみで通信(parser は関数 prop として渡してよい)。store・router を import しない
- QR/バーコード/手入力(MANUAL)/疑似スキャン(DEV)の読取経路は無変更。OCR(`format === 'OCR'`)のみ確認・修正フローが入る
- `ScanTypeTabs.vue` は削除(`git rm`)。`components.test.ts` の ScanTypeTabs テストも削除
- v-dialog / v-menu の中身テストは `attachTo: document.body` + `document.body.querySelector` の既存流儀(`ScanManualInputDialog.test.ts` 参照)
- テストは `src/sample/scan/__tests__/`。実行: `npx vitest run <path>`、全体: `npm run test:run` + `npm run type-check`

---

### Task 1: ScanTypeMenuButton(フッター種別メニュー)

**Files:**
- Create: `src/sample/scan/components/ScanTypeMenuButton.vue`
- Test: `src/sample/scan/__tests__/ScanTypeMenuButton.test.ts`

**Interfaces:**
- Consumes: `ScanType`(`../types`)
- Produces: `ScanTypeMenuButton` — props `{ modelValue: ScanType }`、emits `update:modelValue(ScanType)`。ボタン文言「種別: <ラベル>」、v-menu(上方向)で QR/バーコード/OCR を選択、現在値にチェック

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanTypeMenuButton.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'

describe('ScanTypeMenuButton', () => {
  it('現在の種別ラベルを表示する', () => {
    const w = mount(ScanTypeMenuButton, {
      props: { modelValue: 'barcode' as const },
      attachTo: document.body,
    })
    expect(w.text()).toContain('種別: バーコード')
    w.unmount()
  })

  it('メニューから選択すると update:modelValue を emit する', async () => {
    const w = mount(ScanTypeMenuButton, {
      props: { modelValue: 'barcode' as const },
      attachTo: document.body,
    })
    await w.find('.type-menu-btn').trigger('click')
    await w.vm.$nextTick()
    const qrItem = Array.from(document.body.querySelectorAll('.v-list-item')).find(
      (el) => el.textContent?.includes('QR'),
    )
    expect(qrItem).toBeTruthy()
    ;(qrItem as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['qr'])
    w.unmount()
  })

  it('3種別すべてがメニューに並ぶ', async () => {
    const w = mount(ScanTypeMenuButton, {
      props: { modelValue: 'qr' as const },
      attachTo: document.body,
    })
    await w.find('.type-menu-btn').trigger('click')
    await w.vm.$nextTick()
    const texts = Array.from(document.body.querySelectorAll('.v-list-item')).map(
      (el) => el.textContent ?? '',
    )
    expect(texts.some((t) => t.includes('QR'))).toBe(true)
    expect(texts.some((t) => t.includes('バーコード'))).toBe(true)
    expect(texts.some((t) => t.includes('OCR'))).toBe(true)
    w.unmount()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanTypeMenuButton.test.ts`
Expected: FAIL(コンポーネントが存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanTypeMenuButton.vue`:

```vue
<template>
  <v-menu location="top" eager>
    <template #activator="{ props: menuProps }">
      <v-btn v-bind="menuProps" class="type-menu-btn" append-icon="mdi-menu-up">
        種別: {{ LABELS[modelValue] }}
      </v-btn>
    </template>
    <v-list density="compact">
      <v-list-item
        v-for="t in TYPES"
        :key="t"
        :active="t === modelValue"
        @click="emit('update:modelValue', t)"
      >
        <v-list-item-title>{{ LABELS[t] }}</v-list-item-title>
        <template #append>
          <v-icon v-if="t === modelValue" icon="mdi-check" size="small" />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import type { ScanType } from '../types'

const TYPES: ScanType[] = ['qr', 'barcode', 'ocr']
const LABELS: Record<ScanType, string> = { qr: 'QR', barcode: 'バーコード', ocr: 'OCR' }

defineProps<{ modelValue: ScanType }>()
const emit = defineEmits<{ 'update:modelValue': [value: ScanType] }>()
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanTypeMenuButton.test.ts`
Expected: PASS(3件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): フッター用の種別メニューボタン ScanTypeMenuButton を追加"
```

---

### Task 2: ScanValueEditForm(値+項目編集フォーム)

**Files:**
- Create: `src/sample/scan/components/ScanValueEditForm.vue`
- Test: `src/sample/scan/__tests__/ScanValueEditForm.test.ts`

**Interfaces:**
- Consumes: `ScanFieldDef`(`../types`)、`ScanParser`(`../logic/parsers`)
- Produces: `ScanValueEditForm` — props `{ raw: string; fields: Record<string, string>; fieldDefs: ScanFieldDef[]; parser: ScanParser; rawEditable?: boolean }`(rawEditable default true)、emits `update:raw(string)` / `update:fields(Record<string, string>)`。raw 編集で `parser(raw)` の再分割結果も emit。`rawEditable: false` は raw を読み取り専用テキスト表示(`.raw-static`)。raw 入力欄 class は `.raw-input`、項目入力欄 class は `.field-input-<key>`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanValueEditForm.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
import { createSplitParser, passthroughParser } from '../logic/parsers'
import type { ScanFieldDef } from '../types'

const fieldDefs: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]
const parser = createSplitParser(fieldDefs.map((f) => f.key))

describe('ScanValueEditForm', () => {
  it('raw 編集で update:raw と再分割された update:fields を emit する', async () => {
    const w = mount(ScanValueEditForm, {
      props: { raw: '', fields: {}, fieldDefs, parser },
    })
    await w.find('.raw-input input').setValue('ITEM01,LOT-A,12')
    expect(w.emitted('update:raw')?.at(-1)).toEqual(['ITEM01,LOT-A,12'])
    expect(w.emitted('update:fields')?.at(-1)).toEqual([
      { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
    ])
  })

  it('項目の個別編集はマージして update:fields を emit する(raw は変えない)', async () => {
    const w = mount(ScanValueEditForm, {
      props: {
        raw: 'ITEM01,LOT-A,12',
        fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
        fieldDefs,
        parser,
      },
    })
    await w.find('.field-input-qty input').setValue('99')
    expect(w.emitted('update:fields')?.at(-1)).toEqual([
      { productCode: 'ITEM01', lot: 'LOT-A', qty: '99' },
    ])
    expect(w.emitted('update:raw')).toBeUndefined()
  })

  it('rawEditable: false のとき raw 入力欄はなく読み取り専用表示になる', () => {
    const w = mount(ScanValueEditForm, {
      props: { raw: 'ABC', fields: {}, fieldDefs, parser, rawEditable: false },
    })
    expect(w.find('.raw-input').exists()).toBe(false)
    expect(w.find('.raw-static').text()).toContain('ABC')
  })

  it('fieldDefs が空なら項目入力欄は出ない', () => {
    const w = mount(ScanValueEditForm, {
      props: { raw: 'ABC', fields: {}, fieldDefs: [], parser: passthroughParser },
    })
    expect(w.find('.raw-input').exists()).toBe(true)
    expect(w.findAll('.v-text-field')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanValueEditForm.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanValueEditForm.vue`:

```vue
<template>
  <div class="value-edit-form">
    <v-text-field
      v-if="rawEditable"
      class="raw-input mb-2"
      :model-value="raw"
      label="読取値"
      variant="outlined"
      density="compact"
      @update:model-value="onRawInput"
    />
    <p
      v-else
      class="raw-static text-caption text-medium-emphasis mb-3"
      style="word-break: break-all"
    >
      読取値: {{ raw }}
    </p>

    <v-text-field
      v-for="f in fieldDefs"
      :key="f.key"
      :class="`field-input-${f.key} mb-2`"
      :model-value="fields[f.key] ?? ''"
      :label="f.label"
      variant="outlined"
      density="compact"
      @update:model-value="onFieldInput(f.key, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ScanFieldDef } from '../types'
import type { ScanParser } from '../logic/parsers'

const props = withDefaults(
  defineProps<{
    raw: string
    fields: Record<string, string>
    fieldDefs: ScanFieldDef[]
    parser: ScanParser
    rawEditable?: boolean
  }>(),
  { rawEditable: true },
)
const emit = defineEmits<{
  'update:raw': [value: string]
  'update:fields': [value: Record<string, string>]
}>()

// raw 編集時は parser で項目を自動再分割する。項目の個別編集はマージのみ(raw は触らない)
function onRawInput(v: string) {
  emit('update:raw', v)
  emit('update:fields', props.parser(v))
}
function onFieldInput(key: string, v: string) {
  emit('update:fields', { ...props.fields, [key]: v })
}
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanValueEditForm.test.ts`
Expected: PASS(4件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 値+項目編集フォーム ScanValueEditForm を追加(raw 編集で自動再分割)"
```

---

### Task 3: ScanOcrConfirmDialog(連続系 OCR 確認ダイアログ)

**Files:**
- Create: `src/sample/scan/components/ScanOcrConfirmDialog.vue`
- Test: `src/sample/scan/__tests__/ScanOcrConfirmDialog.test.ts`

**Interfaces:**
- Consumes: Task 2 の `ScanValueEditForm`、`ScanItem`/`ScanFieldDef`(`../types`)、`ScanParser`
- Produces: `ScanOcrConfirmDialog` — props `{ modelValue: boolean; item: ScanItem | null; fieldDefs: ScanFieldDef[]; parser: ScanParser }`、emits `confirm(item: ScanItem)` / `discard()`。開閉は親制御(update:modelValue は出さない)。「追加」`.confirm-btn` は編集後の値・項目で ScanItem を組んで confirm、「破棄」`.discard-btn` は discard のみ

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanOcrConfirmDialog.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import { createSplitParser } from '../logic/parsers'
import type { ScanFieldDef, ScanItem } from '../types'

const fieldDefs: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]
const parser = createSplitParser(fieldDefs.map((f) => f.key))
const item: ScanItem = {
  raw: 'ITEM01,LOT-A,12',
  format: 'OCR',
  timestamp: 1000,
  fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
}

function mountDialog() {
  return mount(ScanOcrConfirmDialog, {
    props: { modelValue: true, item, fieldDefs, parser },
    attachTo: document.body,
  })
}

describe('ScanOcrConfirmDialog', () => {
  it('item の値と項目が初期表示される', async () => {
    const w = mountDialog()
    const rawInput = document.body.querySelector('.raw-input input') as HTMLInputElement
    expect(rawInput.value).toBe('ITEM01,LOT-A,12')
    const qtyInput = document.body.querySelector('.field-input-qty input') as HTMLInputElement
    expect(qtyInput.value).toBe('12')
    w.unmount()
  })

  it('raw を修正して追加すると再分割済みの item を confirm emit する', async () => {
    const w = mountDialog()
    const rawInput = document.body.querySelector('.raw-input input') as HTMLInputElement
    rawInput.value = 'ITEM09,LOT-Z,7'
    rawInput.dispatchEvent(new Event('input'))
    await w.vm.$nextTick()
    ;(document.body.querySelector('.confirm-btn') as HTMLElement).click()
    await w.vm.$nextTick()
    const emitted = w.emitted('confirm')?.[0]?.[0] as ScanItem
    expect(emitted.raw).toBe('ITEM09,LOT-Z,7')
    expect(emitted.fields).toEqual({ productCode: 'ITEM09', lot: 'LOT-Z', qty: '7' })
    expect(emitted.format).toBe('OCR')
    w.unmount()
  })

  it('破棄で discard を emit し confirm は出ない', async () => {
    const w = mountDialog()
    ;(document.body.querySelector('.discard-btn') as HTMLElement).click()
    await w.vm.$nextTick()
    expect(w.emitted('discard')).toHaveLength(1)
    expect(w.emitted('confirm')).toBeUndefined()
    w.unmount()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanOcrConfirmDialog.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanOcrConfirmDialog.vue`:

```vue
<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent eager>
    <v-card>
      <v-card-title class="text-subtitle-1">OCR 読取内容の確認</v-card-title>
      <v-card-text>
        <p class="text-caption text-medium-emphasis mb-3">
          読取結果を確認し、必要なら修正してください
        </p>
        <ScanValueEditForm
          :raw="editRaw"
          :fields="editFields"
          :field-defs="fieldDefs"
          :parser="parser"
          @update:raw="editRaw = $event"
          @update:fields="editFields = $event"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn class="discard-btn" variant="text" @click="emit('discard')">破棄</v-btn>
        <v-btn
          class="confirm-btn"
          color="primary"
          variant="tonal"
          :disabled="!editRaw.trim()"
          @click="onConfirm"
        >追加</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ScanFieldDef, ScanItem } from '../types'
import type { ScanParser } from '../logic/parsers'
import ScanValueEditForm from './ScanValueEditForm.vue'

const props = defineProps<{
  modelValue: boolean
  item: ScanItem | null
  fieldDefs: ScanFieldDef[]
  parser: ScanParser
}>()
const emit = defineEmits<{ confirm: [item: ScanItem]; discard: [] }>()

// 対象 item が変わるたび(=ダイアログが開くたび)にローカル編集用へコピーする
const editRaw = ref('')
const editFields = ref<Record<string, string>>({})
watch(
  () => props.item,
  (item) => {
    editRaw.value = item?.raw ?? ''
    editFields.value = { ...(item?.fields ?? {}) }
  },
  { immediate: true },
)

function onConfirm() {
  if (!props.item) return
  emit('confirm', {
    raw: editRaw.value.trim(),
    format: props.item.format,
    timestamp: props.item.timestamp,
    fields: { ...editFields.value },
  })
}
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanOcrConfirmDialog.test.ts`
Expected: PASS(3件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 連続系 OCR 用の確認ダイアログ ScanOcrConfirmDialog を追加"
```

---

### Task 4: useScanScreen の OCR 保留ロジック

**Files:**
- Modify: `src/sample/scan/logic/useScanScreen.ts`
- Test: `src/sample/scan/__tests__/screenLogic.test.ts`(既存に追記)

**Interfaces:**
- Consumes: 既存 `useScanSessionStore` / `ScanPatternConfig`
- Produces: `useScanScreen(config)` の戻り値に追加 — `pendingOcrItem: Ref<ScanItem | null>`, `confirmOcr(item: ScanItem)`, `discardOcr()`, `parser: ScanParser`(= config.parser)。`handleScan` は `mode === 'continuous' && format === 'OCR'` のとき addItem せず pendingOcrItem に保持

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/screenLogic.test.ts` の `describe('useScanScreen', ...)` 内に追記:

```ts
  it('continuous + OCR: pendingOcrItem に入り items には積まれない', () => {
    const { handleScan, pendingOcrItem } = useScanScreen(getPattern('list-split'))
    handleScan({ text: 'ITEM01,LOT-A,12', format: 'OCR', timestamp: 1 })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(0)
    expect(pendingOcrItem.value?.raw).toBe('ITEM01,LOT-A,12')
    expect(pendingOcrItem.value?.fields.productCode).toBe('ITEM01')
  })

  it('confirmOcr で items に追加され pending がクリアされる', () => {
    const { handleScan, pendingOcrItem, confirmOcr } = useScanScreen(getPattern('list-split'))
    handleScan({ text: 'A,B,1', format: 'OCR', timestamp: 1 })
    confirmOcr({
      raw: 'X,Y,2',
      format: 'OCR',
      timestamp: 1,
      fields: { productCode: 'X', lot: 'Y', qty: '2' },
    })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(1)
    expect(store.items[0].raw).toBe('X,Y,2')
    expect(pendingOcrItem.value).toBeNull()
  })

  it('discardOcr は items に積まず pending をクリアする', () => {
    const { handleScan, pendingOcrItem, discardOcr } = useScanScreen(getPattern('list-raw'))
    handleScan({ text: 'A', format: 'OCR', timestamp: 1 })
    discardOcr()
    expect(useScanSessionStore().items).toHaveLength(0)
    expect(pendingOcrItem.value).toBeNull()
  })

  it('single + OCR は従来どおり保存して結果画面へ遷移する', () => {
    const { handleScan } = useScanScreen(getPattern('single-raw'))
    handleScan({ text: 'ABC', format: 'OCR', timestamp: 1 })
    expect(useScanSessionStore().items).toHaveLength(1)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('continuous + OCR 以外(バーコード等)は従来どおり直接積む', () => {
    const { handleScan, pendingOcrItem } = useScanScreen(getPattern('list-raw'))
    handleScan({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(useScanSessionStore().items).toHaveLength(1)
    expect(pendingOcrItem.value).toBeNull()
  })
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: 既存9件 PASS、新規5件 FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/logic/useScanScreen.ts` を以下に全置換:

```ts
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ScanResult } from '@/types/scanner'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanItem } from '../types'
import type { ScanPatternConfig } from './patterns'

/** スキャン画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useScanScreen(config: ScanPatternConfig) {
  const router = useRouter()
  const store = useScanSessionStore()

  // 結果画面から「再スキャン」で戻った同一パターンはセッション継続、それ以外は新規開始
  if (store.patternId !== config.id) {
    store.startSession(config.id, config.mode)
  }

  const scanType = computed({
    get: () => store.scanType,
    set: (t) => store.setScanType(t),
  })
  const count = computed(() => store.count)
  const latest = computed(() => store.latest)

  function toItem(r: ScanResult): ScanItem {
    return { raw: r.text, format: r.format, timestamp: r.timestamp, fields: config.parser(r.text) }
  }

  // OCR は誤読前提のため、連続モードでは確認ダイアログを挟んでから積む
  const pendingOcrItem = ref<ScanItem | null>(null)

  function handleScan(r: ScanResult) {
    const item = toItem(r)
    if (config.mode === 'continuous' && r.format === 'OCR') {
      pendingOcrItem.value = item
      return
    }
    if (config.mode === 'single') {
      store.setSingleResult(item)
      router.push(config.resultPath)
    } else {
      store.addItem(item)
    }
  }

  function confirmOcr(item: ScanItem) {
    store.addItem(item)
    pendingOcrItem.value = null
  }
  function discardOcr() {
    pendingOcrItem.value = null
  }

  function finish() {
    router.push(config.resultPath)
  }
  function cancel() {
    store.reset()
    router.back()
  }

  return {
    scanType, count, latest, handleScan, finish, cancel,
    pendingOcrItem, confirmOcr, discardOcr,
    isContinuous: config.mode === 'continuous',
    title: config.title,
    fields: config.fields,
    parser: config.parser,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: PASS(14件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): useScanScreen に連続 OCR の確認保留(pendingOcrItem)を追加"
```

---

### Task 5: スキャンページ移行(タブ廃止・フッターメニュー・連続系ダイアログ)

**Files:**
- Modify: `src/sample/scan/pages/SingleRawScanPage.vue` / `SingleSplitScanPage.vue` / `SingleLookupScanPage.vue` / `ListRawScanPage.vue` / `ListSplitScanPage.vue`
- Delete: `src/sample/scan/components/ScanTypeTabs.vue`(`git rm`)
- Modify: `src/sample/scan/__tests__/components.test.ts`(ScanTypeTabs の import と describe ブロックを削除)
- Test: `src/sample/scan/__tests__/scanPages.test.ts`(追記)

**Interfaces:**
- Consumes: Task 1 `ScanTypeMenuButton`(v-model)、Task 3 `ScanOcrConfirmDialog`、Task 4 の `pendingOcrItem`/`confirmOcr`/`discardOcr`/`parser`
- Produces: 5ページの新レイアウト(タブなし・フッター種別メニュー)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/scanPages.test.ts` に import を追加:

```ts
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
```

describe 群の末尾に追記:

```ts
describe('種別メニュー(フッター)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('フッターの種別メニューで種別を切り替えられる', async () => {
    const w = mount(SingleRawScanPage, mountOpts)
    const menuBtn = w.findComponent(ScanTypeMenuButton)
    expect(menuBtn.exists()).toBe(true)
    menuBtn.vm.$emit('update:modelValue', 'qr')
    await w.vm.$nextTick()
    expect(useScanSessionStore().scanType).toBe('qr')
  })

  it('タブ(v-tabs)は表示されない', () => {
    const w = mount(SingleRawScanPage, mountOpts)
    expect(w.find('.v-tabs').exists()).toBe(false)
  })
})

describe('連続ページの OCR 確認フロー', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('OCR スキャンは確認ダイアログに入り confirm でリストへ追加される', async () => {
    const w = mount(ListSplitScanPage, mountOpts)
    capturedOnScan!({ text: 'ITEM01,LOT-A,12', format: 'OCR', timestamp: 1 })
    await w.vm.$nextTick()
    const store = useScanSessionStore()
    expect(store.count).toBe(0)
    const dialog = w.findComponent(ScanOcrConfirmDialog)
    expect(dialog.props('modelValue')).toBe(true)
    dialog.vm.$emit('confirm', {
      raw: 'ITEM09,LOT-Z,7',
      format: 'OCR',
      timestamp: 1,
      fields: { productCode: 'ITEM09', lot: 'LOT-Z', qty: '7' },
    })
    await w.vm.$nextTick()
    expect(store.count).toBe(1)
    expect(store.items[0].raw).toBe('ITEM09,LOT-Z,7')
    expect(w.findComponent(ScanOcrConfirmDialog).props('modelValue')).toBe(false)
  })

  it('discard でリストに積まれない', async () => {
    const w = mount(ListSplitScanPage, mountOpts)
    capturedOnScan!({ text: 'ITEM01,LOT-A,12', format: 'OCR', timestamp: 1 })
    await w.vm.$nextTick()
    const dialog = w.findComponent(ScanOcrConfirmDialog)
    dialog.vm.$emit('discard')
    await w.vm.$nextTick()
    expect(useScanSessionStore().count).toBe(0)
    expect(w.findComponent(ScanOcrConfirmDialog).props('modelValue')).toBe(false)
  })
})
```

※ `capturedOnScan` に `format: 'OCR'` を渡すのは「OCR 由来の読取が handleScan に届いた」状況の直接シミュレーション(engine の captureOcr と同じ経路)。store の scanType は barcode のままでよい(handleScan は format で判定する)。

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/scanPages.test.ts`
Expected: 既存5件 PASS、新規4件 FAIL

- [ ] **Step 3: 実装**

5ページを以下に全置換。

`src/sample/scan/pages/SingleRawScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      読み取ると結果画面へ遷移します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title } = useScanScreen(getPattern('single-raw'))
</script>
```

`src/sample/scan/pages/SingleSplitScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      「商品コード,ロット,数量」形式のコードを読み取ると、分割して各項目に代入します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title } = useScanScreen(getPattern('single-split'))
</script>
```

`src/sample/scan/pages/SingleLookupScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      商品コード(数値)を読み取ると、API で商品情報を照会して表示します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title } = useScanScreen(getPattern('single-lookup'))
</script>
```

`src/sample/scan/pages/ListRawScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <ScanOcrConfirmDialog
      :model-value="pendingOcrItem !== null"
      :item="pendingOcrItem"
      :field-defs="fields"
      :parser="parser"
      @confirm="confirmOcr"
      @discard="discardOcr"
    />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const {
  scanType, count, latest, fields, parser,
  handleScan, finish, cancel, title,
  pendingOcrItem, confirmOcr, discardOcr,
} = useScanScreen(getPattern('list-raw'))
</script>
```

`src/sample/scan/pages/ListSplitScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <ScanOcrConfirmDialog
      :model-value="pendingOcrItem !== null"
      :item="pendingOcrItem"
      :field-defs="fields"
      :parser="parser"
      @confirm="confirmOcr"
      @discard="discardOcr"
    />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const {
  scanType, count, latest, fields, parser,
  handleScan, finish, cancel, title,
  pendingOcrItem, confirmOcr, discardOcr,
} = useScanScreen(getPattern('list-split'))
</script>
```

タブ部品を削除:

```bash
git rm src/sample/scan/components/ScanTypeTabs.vue
```

`src/sample/scan/__tests__/components.test.ts` から `import ScanTypeTabs from '../components/ScanTypeTabs.vue'` と `describe('ScanTypeTabs', ...)` ブロック全体を削除。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/scanPages.test.ts src/sample/scan/__tests__/components.test.ts`
Expected: scanPages 9件 PASS、components 3件 PASS(ScanTypeTabs の1件が消える)

- [ ] **Step 5: コミット**

```bash
git add -A src/sample/scan
git commit -m "feat(sample-scan): 種別タブを廃止しフッターメニューへ移行、連続系に OCR 確認ダイアログを配置"
```

---

### Task 6: 単発結果画面の OCR 編集対応 + 全体検証

**Files:**
- Modify: `src/sample/scan/pages/SingleRawResultPage.vue` / `SingleSplitResultPage.vue` / `SingleLookupResultPage.vue`
- Test: `src/sample/scan/__tests__/resultPages.test.ts`(追記)

**Interfaces:**
- Consumes: Task 2 `ScanValueEditForm`(props: raw/fields/fieldDefs/parser/rawEditable、emits update:raw/update:fields)、既存 `useResultScreen`/`getPattern`/`useProductDetail`
- Produces: 単発結果画面3枚が `format === 'OCR'` のとき編集フォーム表示

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/resultPages.test.ts` に import を追加:

```ts
import SingleRawResultPage from '../pages/SingleRawResultPage.vue'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
```

describe 群の末尾に追記:

```ts
describe('SingleRawResultPage (OCR 編集)', () => {
  beforeEach(() => vi.clearAllMocks())

  function seed(format: string) {
    const store = useScanSessionStore()
    store.startSession('single-raw', 'single')
    store.setSingleResult({ raw: 'ITEM01,LOT-A,12', format, timestamp: 1000, fields: {} })
  }

  it('OCR 読取時は編集フォームを表示し値を修正できる', async () => {
    seed('OCR')
    const w = mount(SingleRawResultPage, mountOpts)
    const form = w.findComponent(ScanValueEditForm)
    expect(form.exists()).toBe(true)
    expect((w.find('.raw-input input').element as HTMLInputElement).value).toBe(
      'ITEM01,LOT-A,12',
    )
    await w.find('.raw-input input').setValue('ITEM09')
    expect((w.find('.raw-input input').element as HTMLInputElement).value).toBe('ITEM09')
  })

  it('OCR でない読取は従来の結果カード表示', () => {
    seed('EAN_13')
    const w = mount(SingleRawResultPage, mountOpts)
    expect(w.findComponent(ScanValueEditForm).exists()).toBe(false)
    expect(w.text()).toContain('ITEM01,LOT-A,12')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/resultPages.test.ts`
Expected: 既存6件 PASS、新規2件 FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/pages/SingleRawResultPage.vue` を以下に全置換:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <template v-if="single">
      <div v-if="isOcr" class="pa-4">
        <p class="text-caption text-medium-emphasis mb-3">OCR 読取のため値を修正できます</p>
        <ScanValueEditForm
          :raw="editRaw"
          :fields="{}"
          :field-defs="[]"
          :parser="pattern.parser"
          @update:raw="editRaw = $event"
        />
      </div>
      <ScanResultCard v-else :item="single" />
    </template>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanResultCard from '../components/ScanResultCard.vue'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const pattern = getPattern('single-raw')
const { single, rescan, confirm, title } = useResultScreen(pattern)

// OCR は誤読前提のため値をローカル編集可能にする(確定時の永続化はサンプル対象外)
const isOcr = computed(() => single.value?.format === 'OCR')
const editRaw = ref('')
watch(single, (s) => { editRaw.value = s?.raw ?? '' }, { immediate: true })
</script>
```

`src/sample/scan/pages/SingleSplitResultPage.vue` を以下に全置換:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="pa-4">
      <p v-if="isOcr" class="text-caption text-medium-emphasis mb-3">
        OCR 読取のため値と項目を修正できます
      </p>
      <ScanValueEditForm
        :raw="editRaw"
        :fields="editFields"
        :field-defs="fields"
        :parser="pattern.parser"
        :raw-editable="isOcr"
        @update:raw="editRaw = $event"
        @update:fields="editFields = $event"
      />
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const pattern = getPattern('single-split')
const { single, fields, rescan, confirm, title } = useResultScreen(pattern)

// 分割結果をローカル編集用に展開。OCR のときは raw も編集可能(編集で自動再分割)
const isOcr = computed(() => single.value?.format === 'OCR')
const editRaw = ref('')
const editFields = ref<Record<string, string>>({})
watch(
  single,
  (s) => {
    editRaw.value = s?.raw ?? ''
    editFields.value = { ...(s?.fields ?? {}) }
  },
  { immediate: true },
)
</script>
```

`src/sample/scan/pages/SingleLookupResultPage.vue` を以下に全置換:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="pa-4">
      <div v-if="isOcr" class="mb-3">
        <p class="text-caption text-medium-emphasis mb-3">
          OCR 読取のため商品コードを修正できます(修正すると再照会します)
        </p>
        <ScanValueEditForm
          :raw="rawValue"
          :fields="{}"
          :field-defs="[]"
          :parser="pattern.parser"
          @update:raw="rawValue = $event"
        />
      </div>
      <p v-else class="text-caption text-medium-emphasis mb-3" style="word-break: break-all">
        読取値: {{ rawValue }}
      </p>

      <v-alert v-if="!isValidId" type="warning" density="compact">
        商品コードが数値ではありません
      </v-alert>
      <v-card v-else variant="outlined">
        <v-card-text>
          <div v-if="isLoading" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" />
            <p class="text-caption text-medium-emphasis mt-2">照会中...</p>
          </div>
          <template v-else-if="product">
            <p class="text-overline text-medium-emphasis mb-1">商品情報</p>
            <p class="text-body-1 font-weight-bold mb-2">{{ product.name }}</p>
            <p class="text-body-2">価格: ¥{{ product.price.toLocaleString() }}</p>
            <p class="text-body-2">在庫: {{ product.inStock ? 'あり' : 'なし' }}</p>
            <p class="text-caption text-medium-emphasis mt-2">{{ product.description }}</p>
          </template>
          <p v-else class="text-body-2 text-medium-emphasis">該当する商品が見つかりません</p>
        </v-card-text>
      </v-card>
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!product" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'
import { useProductDetail } from '@/composables/queries/useProductDetail'

const pattern = getPattern('single-lookup')
const { single, rescan, confirm, title } = useResultScreen(pattern)

// OCR のときは商品コードを編集可能にし、編集値で再照会する
const isOcr = computed(() => single.value?.format === 'OCR')
const rawValue = ref('')
watch(single, (s) => { rawValue.value = s?.raw ?? '' }, { immediate: true })
const isValidId = computed(() => /^\d+$/.test(rawValue.value))
const productId = computed<number | null>(() =>
  isValidId.value ? Number.parseInt(rawValue.value, 10) : null,
)
const { product, isLoading } = useProductDetail(productId)
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/resultPages.test.ts`
Expected: PASS(8件)

- [ ] **Step 5: 全体検証**

```bash
npm run test:run
npm run type-check
```

Expected: 全テスト PASS(Task 1〜6 の追加分含む)、型エラーなし。

- [ ] **Step 6: ブラウザ確認(手動)**

`npm run dev` で確認:

1. スキャン画面にタブがなく、カメラがヘッダー直下から始まる
2. フッターの「種別: バーコード ▴」タップでメニューが上に開き、QR/OCR へ切替できる
3. OCR 選択→シャッター: 連続系は確認ダイアログ(値+項目編集)→追加でリストへ/破棄で捨てる
4. 単発系で OCR 読取→結果画面が編集フォーム表示(single-raw: 値のみ、single-split: 値+項目で raw 編集時に再分割、single-lookup: 値編集で再照会)
5. QR/バーコード読取と手入力(MANUAL)は従来どおり
6. 横スクロールなし

- [ ] **Step 7: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 単発結果画面で OCR 読取値と項目を手動修正可能に"
```
