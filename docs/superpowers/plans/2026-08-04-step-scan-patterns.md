# ステップ式ペア読取パターン(pair-single / pair-list)実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スキャンパターン集に「①バーコード→②QR/バーコード」の2ステップ読取パターン(単発ペア/連続ペア)を、v-stepper ヘッダーの導線付きで追加する。

**Architecture:** 既存5パターン(single/list 系)には手を入れず、別モジュール(stepPatterns / useStepScanScreen / useStepResultScreen / stepScanSessionStore / ScanStepHeader)を追加する。カメラ・手入力ダイアログ・レイアウトは既存部品を再利用。QR+バーコード同時待ち受けは `useScanEngine` の formats 解決の拡張(`'qr-or-barcode'`)で実現する。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Vuetify 4(v-stepper), Pinia, vue-router, @zxing/browser(既存 useBarcodeScanner 経由), Vitest + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-08-04-step-scan-patterns-design.md`

## Global Constraints

- 既存5パターン(single-raw/single-split/single-lookup/list-raw/list-split)の挙動・既存テストは無改修(型の後方互換な広げのみ可)
- store にはシリアライズ可能な値のみ入れる(関数・コールバック禁止)
- UI 文言・コードコメントは日本語(既存流儀に合わせる)
- `ScanType` union(`'qr' | 'barcode' | 'ocr'`)は変更しない。同時待ち受けは別型 `ScanAcceptType` で表す
- OCR はステップフロー対象外。ステップ画面に種別メニュー(`ScanTypeMenuButton`)は出さない
- テスト実行: `npx vitest run <テストファイルパス>`(全件は `npm run test:run`)。型チェック: `npm run type-check`
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: 読取エンジンの `qr-or-barcode` 対応

**Files:**
- Modify: `src/sample/scan/types/index.ts`
- Modify: `src/sample/scan/logic/useScanEngine.ts`
- Modify: `src/sample/scan/components/ScanCameraView.vue`
- Test: `src/sample/scan/__tests__/useScanEngine.test.ts`(既存ファイルにテスト追加)

**Interfaces:**
- Consumes: 既存 `ScanType`, `QR_FORMATS`, `BARCODE_FORMATS`
- Produces: `export type ScanAcceptType = ScanType | 'qr-or-barcode'`(types/index.ts)。`useScanEngine(videoRef, scanType: Ref<ScanAcceptType>, onScan)` と `ScanCameraView` の `scanType` prop が `ScanAcceptType` を受け付ける(既存呼び出しは `ScanType` のままで型互換)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/useScanEngine.test.ts` の `setup` の型を広げ、テストを2件追加する。

```ts
// setup の引数型を変更(ScanType → ScanAcceptType)
import type { ScanAcceptType } from '../types'

function setup(type: ScanAcceptType) {
  const scanType = ref<ScanAcceptType>(type)
  const onScan = vi.fn()
  const engine = useScanEngine(ref(null) as Ref<HTMLVideoElement | null>, scanType, onScan)
  return { scanType, onScan, engine }
}
```

describe 内に追加:

```ts
  it('qr-or-barcode のとき formats は QR+バーコードの結合を返す', () => {
    setup('qr-or-barcode')
    expect(capturedOptions!.formats!()).toEqual([...QR_FORMATS, ...BARCODE_FORMATS])
  })

  it('qr-or-barcode のとき zxing の読取は通知される', () => {
    const { onScan } = setup('qr-or-barcode')
    capturedOptions!.onScan({ text: 'A', format: 'QR_CODE', timestamp: 1 })
    expect(onScan).toHaveBeenCalledTimes(1)
  })
```

既存の import 行 `import type { ScanType } from '../types'` は `ScanAcceptType` に置き換える(`ScanType` が未使用になるため)。

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/useScanEngine.test.ts`
Expected: FAIL(`ScanAcceptType` が存在しない型エラー、または formats が `BARCODE_FORMATS` を返して不一致)

- [ ] **Step 3: 実装**

`src/sample/scan/types/index.ts` の `ScanType` の直後に追加:

```ts
/** ステップ読取で受け付ける種別。qr-or-barcode は QR とバーコードの同時待ち受け */
export type ScanAcceptType = ScanType | 'qr-or-barcode'
```

`src/sample/scan/logic/useScanEngine.ts`:

```ts
// import を変更
import type { ScanAcceptType } from '../types'

// シグネチャを変更(呼び出し側は ScanType のままで互換)
export function useScanEngine(
  videoRef: Ref<HTMLVideoElement | null>,
  scanType: Ref<ScanAcceptType>,
  onScan: (result: ScanResult) => void,
) {
```

formats の解決を変更:

```ts
    formats: () =>
      scanType.value === 'qr'
        ? QR_FORMATS
        : scanType.value === 'qr-or-barcode'
          ? [...QR_FORMATS, ...BARCODE_FORMATS]
          : BARCODE_FORMATS,
```

`src/sample/scan/components/ScanCameraView.vue` の props 型を広げる:

```ts
import type { ScanAcceptType } from '../types'

const props = defineProps<{ scanType: ScanAcceptType }>()
```

(`import type { ScanType } from '../types'` は削除。他は無変更 — `watch(() => props.scanType, ...)` の restart 機構がステップ遷移時の formats 切替をそのまま担う)

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/useScanEngine.test.ts`
Expected: PASS(既存6件+新規2件)

- [ ] **Step 5: 既存テストに影響がないことを確認**

Run: `npm run test:run`
Expected: 全件 PASS

- [ ] **Step 6: コミット**

```bash
git add src/sample/scan/types/index.ts src/sample/scan/logic/useScanEngine.ts src/sample/scan/components/ScanCameraView.vue src/sample/scan/__tests__/useScanEngine.test.ts
git commit -m "feat(sample-scan): 読取エンジンに qr-or-barcode(QR+バーコード同時待ち受け)を追加"
```

---

### Task 2: ステップパターン定義 stepPatterns.ts

**Files:**
- Create: `src/sample/scan/logic/stepPatterns.ts`
- Test: `src/sample/scan/__tests__/stepPatterns.test.ts`

**Interfaces:**
- Consumes: `ScanAcceptType`, `ScanSessionMode`(types/index.ts)
- Produces:
  - `interface ScanStepDef { key: string; label: string; guide: string; accept: ScanAcceptType }`
  - `interface StepScanPatternConfig { id: string; title: string; description: string; icon: string; mode: ScanSessionMode; steps: ScanStepDef[]; scanPath: string; resultPath: string }`
  - `STEP_SCAN_PATTERNS: StepScanPatternConfig[]`(pair-single / pair-list)
  - `getStepPattern(id: string): StepScanPatternConfig`(未知 id は throw)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/stepPatterns.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { STEP_SCAN_PATTERNS, getStepPattern } from '../logic/stepPatterns'

describe('stepPatterns', () => {
  it('pair-single / pair-list の2パターンが定義されている', () => {
    expect(STEP_SCAN_PATTERNS.map((p) => p.id)).toEqual(['pair-single', 'pair-list'])
  })

  it('全パターンが2ステップ(①バーコード ②QR/バーコード)を持つ', () => {
    for (const p of STEP_SCAN_PATTERNS) {
      expect(p.steps).toHaveLength(2)
      expect(p.steps[0].accept).toBe('barcode')
      expect(p.steps[1].accept).toBe('qr-or-barcode')
      expect(p.steps.every((s) => s.label && s.guide)).toBe(true)
    }
  })

  it('mode とパスが規約どおり', () => {
    const single = getStepPattern('pair-single')
    expect(single.mode).toBe('single')
    expect(single.scanPath).toBe('/sample/scan/pair-single')
    expect(single.resultPath).toBe('/sample/scan/pair-single/result')
    const list = getStepPattern('pair-list')
    expect(list.mode).toBe('continuous')
    expect(list.scanPath).toBe('/sample/scan/pair-list')
    expect(list.resultPath).toBe('/sample/scan/pair-list/result')
  })

  it('未知の id は throw する', () => {
    expect(() => getStepPattern('nope')).toThrow()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepPatterns.test.ts`
Expected: FAIL(モジュールが存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/logic/stepPatterns.ts`:

```ts
import type { ScanAcceptType, ScanSessionMode } from '../types'

/**
 * ステップ式読取のパターン定義。
 * 既存 patterns.ts(単一読取)とは独立したモジュールとして持つ。
 * steps は配列定義のため、3ステップ以上のパターンもここに足すだけで拡張できる。
 */
export interface ScanStepDef {
  key: string
  /** ステッパー表示名 */
  label: string
  /** カメラ上部に出す案内文 */
  guide: string
  /** このステップで受け付ける読取種別 */
  accept: ScanAcceptType
}

export interface StepScanPatternConfig {
  id: string
  title: string
  description: string
  icon: string
  mode: ScanSessionMode
  steps: ScanStepDef[]
  scanPath: string
  resultPath: string
}

/** ①バーコード → ②QR/バーコード の2ステップ(両パターン共通) */
const PAIR_STEPS: ScanStepDef[] = [
  {
    key: 'first',
    label: 'バーコード',
    guide: '1つ目のバーコードを読み取ってください',
    accept: 'barcode',
  },
  {
    key: 'second',
    label: 'QR/バーコード',
    guide: '2つ目のコードを読み取ってください(QR・バーコードどちらでも)',
    accept: 'qr-or-barcode',
  },
]

function paths(id: string) {
  return { scanPath: `/sample/scan/${id}`, resultPath: `/sample/scan/${id}/result` }
}

export const STEP_SCAN_PATTERNS: StepScanPatternConfig[] = [
  {
    id: 'pair-single',
    title: 'ステップ × 単発ペア',
    description: 'バーコード→QR/バーコードの2ステップで1組読み取り、結果画面に表示',
    icon: 'mdi-numeric-2-box-outline',
    mode: 'single',
    steps: PAIR_STEPS,
    ...paths('pair-single'),
  },
  {
    id: 'pair-list',
    title: 'ステップ × 連続ペア',
    description: '2ステップで1組を作り、リストに蓄積して一括確定',
    icon: 'mdi-format-list-numbered',
    mode: 'continuous',
    steps: PAIR_STEPS,
    ...paths('pair-list'),
  },
]

export function getStepPattern(id: string): StepScanPatternConfig {
  const p = STEP_SCAN_PATTERNS.find((x) => x.id === id)
  if (!p) throw new Error(`unknown step scan pattern: ${id}`)
  return p
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepPatterns.test.ts`
Expected: PASS(4件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan/logic/stepPatterns.ts src/sample/scan/__tests__/stepPatterns.test.ts
git commit -m "feat(sample-scan): ステップ式ペア読取のパターン定義 stepPatterns を追加"
```

---

### Task 3: stepScanSessionStore

**Files:**
- Modify: `src/sample/scan/types/index.ts`(`ScanSetItem` 追加)
- Create: `src/sample/scan/stores/stepScanSessionStore.ts`
- Test: `src/sample/scan/__tests__/stepScanSessionStore.test.ts`

**Interfaces:**
- Consumes: `ScanItem`, `ScanSessionMode`(types/index.ts)
- Produces:
  - `interface ScanSetItem { parts: ScanItem[] }`(types/index.ts)
  - `useStepScanSessionStore()` — state: `patternId: string | null`, `mode: ScanSessionMode`, `parts: ScanItem[]`(進行中の組), `sets: ScanSetItem[]`(完成した組)。
    getters: `hasSession: boolean`, `currentStepIndex: number`(= parts.length の導出値), `setCount: number`, `firstSet: ScanSetItem | null`。
    actions: `startSession(id: string, m: ScanSessionMode)`, `addPart(item: ScanItem)`, `completeSet()`, `stepBack()`, `removeSet(index: number)`, `clearSets()`, `reset()`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/stepScanSessionStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { ScanItem } from '../types'

const item = (raw: string, timestamp = 1): ScanItem => ({
  raw,
  format: 'EAN_13',
  timestamp,
  fields: {},
})

describe('stepScanSessionStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初期状態はセッションなし・ステップ0', () => {
    const store = useStepScanSessionStore()
    expect(store.hasSession).toBe(false)
    expect(store.currentStepIndex).toBe(0)
    expect(store.setCount).toBe(0)
  })

  it('startSession でパターン/モードを設定し parts/sets をクリアする', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('old'))
    store.completeSet()
    store.startSession('pair-list', 'continuous')
    expect(store.patternId).toBe('pair-list')
    expect(store.mode).toBe('continuous')
    expect(store.parts).toHaveLength(0)
    expect(store.sets).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('addPart で parts に積まれ currentStepIndex が進む', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('A'))
    expect(store.currentStepIndex).toBe(1)
    store.addPart(item('B'))
    expect(store.currentStepIndex).toBe(2)
    expect(store.parts.map((p) => p.raw)).toEqual(['A', 'B'])
  })

  it('completeSet で parts が sets に移り currentStepIndex が 0 に戻る', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('A'))
    store.addPart(item('B'))
    store.completeSet()
    expect(store.setCount).toBe(1)
    expect(store.sets[0].parts.map((p) => p.raw)).toEqual(['A', 'B'])
    expect(store.parts).toHaveLength(0)
    expect(store.currentStepIndex).toBe(0)
    expect(store.firstSet?.parts[0].raw).toBe('A')
  })

  it('stepBack は直前の part を破棄して1つ戻る(空なら何もしない)', () => {
    const store = useStepScanSessionStore()
    store.stepBack() // 空でもエラーにならない
    store.addPart(item('A'))
    store.addPart(item('B'))
    store.stepBack()
    expect(store.parts.map((p) => p.raw)).toEqual(['A'])
    expect(store.currentStepIndex).toBe(1)
  })

  it('removeSet は指定 index の組を削除する', () => {
    const store = useStepScanSessionStore()
    store.addPart(item('A'))
    store.completeSet()
    store.addPart(item('B'))
    store.completeSet()
    store.removeSet(0)
    expect(store.sets.map((s) => s.parts[0].raw)).toEqual(['B'])
  })

  it('clearSets は sets と parts を空にしセッションは維持する', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-single', 'single')
    store.addPart(item('A'))
    store.completeSet()
    store.addPart(item('B'))
    store.clearSets()
    expect(store.sets).toHaveLength(0)
    expect(store.parts).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('reset でセッション終了', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-single', 'single')
    store.addPart(item('A'))
    store.reset()
    expect(store.hasSession).toBe(false)
    expect(store.parts).toHaveLength(0)
    expect(store.sets).toHaveLength(0)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScanSessionStore.test.ts`
Expected: FAIL(store モジュールが存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/types/index.ts` の末尾に追加:

```ts
/** ステップ読取の1組分。parts はステップ定義と同じ順序 */
export interface ScanSetItem {
  parts: ScanItem[]
}
```

`src/sample/scan/stores/stepScanSessionStore.ts`:

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ScanItem, ScanSessionMode, ScanSetItem } from '../types'

/**
 * ステップ式スキャン画面⇄結果画面の画面またぎ専用 store。
 * シリアライズ可能なデータのみ保持する(コールバック・関数は入れない)。
 */
export const useStepScanSessionStore = defineStore('sampleStepScanSession', () => {
  const patternId = ref<string | null>(null)
  const mode = ref<ScanSessionMode>('single')
  /** 進行中の組(読取済みステップの値) */
  const parts = ref<ScanItem[]>([])
  /** 完成した組 */
  const sets = ref<ScanSetItem[]>([])

  const hasSession = computed(() => patternId.value !== null)
  // 現在のステップ位置は「読取済み parts 数」と常に一致するため導出値にする
  const currentStepIndex = computed(() => parts.value.length)
  const setCount = computed(() => sets.value.length)
  const firstSet = computed(() => sets.value[0] ?? null)

  function startSession(id: string, m: ScanSessionMode) {
    patternId.value = id
    mode.value = m
    parts.value = []
    sets.value = []
  }
  function addPart(item: ScanItem) {
    parts.value = [...parts.value, item]
  }
  function completeSet() {
    sets.value = [...sets.value, { parts: parts.value }]
    parts.value = []
  }
  function stepBack() {
    parts.value = parts.value.slice(0, -1)
  }
  function removeSet(index: number) {
    sets.value = sets.value.filter((_, i) => i !== index)
  }
  function clearSets() {
    sets.value = []
    parts.value = []
  }
  function reset() {
    patternId.value = null
    parts.value = []
    sets.value = []
  }

  return {
    patternId, mode, parts, sets,
    hasSession, currentStepIndex, setCount, firstSet,
    startSession, addPart, completeSet, stepBack, removeSet, clearSets, reset,
  }
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScanSessionStore.test.ts`
Expected: PASS(8件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan/types/index.ts src/sample/scan/stores/stepScanSessionStore.ts src/sample/scan/__tests__/stepScanSessionStore.test.ts
git commit -m "feat(sample-scan): ステップ読取セッション用 stepScanSessionStore を追加"
```

---

### Task 4: useStepScanScreen(スキャン画面ロジック)

**Files:**
- Create: `src/sample/scan/logic/useStepScanScreen.ts`
- Test: `src/sample/scan/__tests__/stepScreenLogic.test.ts`(新規。Task 5 で useStepResultScreen の describe を同ファイルに追加)

**Interfaces:**
- Consumes: `getStepPattern` / `StepScanPatternConfig`(Task 2)、`useStepScanSessionStore`(Task 3)、`useSnackbar`(`showSnack(type, message)`)、`ScanResult`(`@/types/scanner`)
- Produces: `useStepScanScreen(config: StepScanPatternConfig)` の戻り値:
  `steps: ScanStepDef[]`, `currentStep: ComputedRef<ScanStepDef>`, `currentStepIndex: ComputedRef<number>`,
  `parts: ComputedRef<ScanItem[]>`, `setCount: ComputedRef<number>`, `canStepBack: ComputedRef<boolean>`,
  `handleScan(r: ScanResult)`, `stepBack()`, `manualOpen: Ref<boolean>`, `openManual()`, `handleManualSubmit(text: string)`,
  `finish()`, `cancel()`, `isContinuous: boolean`, `title: string`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/stepScreenLogic.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

import { useStepScanScreen } from '../logic/useStepScanScreen'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'

describe('useStepScanScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('初期状態はステップ0で currentStep は1つ目の定義を返す', () => {
    const { currentStep, currentStepIndex, canStepBack } = useStepScanScreen(
      getStepPattern('pair-single'),
    )
    expect(currentStepIndex.value).toBe(0)
    expect(currentStep.value.accept).toBe('barcode')
    expect(canStepBack.value).toBe(false)
  })

  it('1回目の読取でステップ2へ進み currentStep が切り替わる', () => {
    const { handleScan, currentStep, currentStepIndex, canStepBack } = useStepScanScreen(
      getStepPattern('pair-single'),
    )
    handleScan({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(currentStepIndex.value).toBe(1)
    expect(currentStep.value.accept).toBe('qr-or-barcode')
    expect(canStepBack.value).toBe(true)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('single: 2回目の読取で組が完成し結果画面へ遷移する', () => {
    const { handleScan } = useStepScanScreen(getStepPattern('pair-single'))
    handleScan({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    handleScan({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    const store = useStepScanSessionStore()
    expect(store.setCount).toBe(1)
    expect(store.firstSet?.parts.map((p) => p.raw)).toEqual(['BAR-1', 'QR-1'])
    expect(store.currentStepIndex).toBe(0)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-single/result')
  })

  it('continuous: 組完成でリストに蓄積されステップ①へ戻る(遷移しない)', () => {
    const { handleScan, currentStepIndex, setCount } = useStepScanScreen(
      getStepPattern('pair-list'),
    )
    handleScan({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    handleScan({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    handleScan({ text: 'BAR-2', format: 'EAN_13', timestamp: 3 })
    handleScan({ text: 'QR-2', format: 'CODE_128', timestamp: 4 })
    expect(setCount.value).toBe(2)
    expect(currentStepIndex.value).toBe(0)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('stepBack で直前ステップをやり直せる', () => {
    const { handleScan, stepBack, currentStepIndex, parts } = useStepScanScreen(
      getStepPattern('pair-list'),
    )
    handleScan({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    stepBack()
    expect(currentStepIndex.value).toBe(0)
    expect(parts.value).toHaveLength(0)
  })

  it('同一パターンのセッションが残っていれば継続する(sets 保持)', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    store.completeSet()
    useStepScanScreen(getStepPattern('pair-list'))
    expect(store.setCount).toBe(1)
  })

  it('別パターンのセッションが残っていれば新規開始する', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    useStepScanScreen(getStepPattern('pair-single'))
    expect(store.patternId).toBe('pair-single')
    expect(store.parts).toHaveLength(0)
  })

  it('手入力は MANUAL として現在ステップの値になる', () => {
    const { handleManualSubmit, manualOpen, openManual } = useStepScanScreen(
      getStepPattern('pair-list'),
    )
    expect(manualOpen.value).toBe(false)
    openManual()
    expect(manualOpen.value).toBe(true)
    handleManualSubmit('ABC-123')
    const store = useStepScanSessionStore()
    expect(store.parts[0].raw).toBe('ABC-123')
    expect(store.parts[0].format).toBe('MANUAL')
  })

  it('finish で結果画面へ、cancel でセッション破棄して戻る', () => {
    const { finish, cancel } = useStepScanScreen(getStepPattern('pair-list'))
    finish()
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-list/result')
    cancel()
    expect(useStepScanSessionStore().hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScreenLogic.test.ts`
Expected: FAIL(useStepScanScreen が存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/logic/useStepScanScreen.ts`:

```ts
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import type { ScanResult } from '@/types/scanner'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { StepScanPatternConfig } from './stepPatterns'

/** ステップ式スキャン画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useStepScanScreen(config: StepScanPatternConfig) {
  const router = useRouter()
  const store = useStepScanSessionStore()
  const { showSnack } = useSnackbar()

  // 結果画面から「再スキャン」で戻った同一パターンはセッション継続、それ以外は新規開始
  if (store.patternId !== config.id) {
    store.startSession(config.id, config.mode)
  }

  const currentStepIndex = computed(() => store.currentStepIndex)
  // 組完成の瞬間(parts が満杯)でも範囲外参照しないようクランプする
  const currentStep = computed(
    () => config.steps[Math.min(store.currentStepIndex, config.steps.length - 1)],
  )
  const parts = computed(() => store.parts)
  const setCount = computed(() => store.setCount)
  const canStepBack = computed(() => store.parts.length > 0)

  function handleScan(r: ScanResult) {
    store.addPart({ raw: r.text, format: r.format, timestamp: r.timestamp, fields: {} })
    if (store.parts.length < config.steps.length) return
    store.completeSet()
    if (config.mode === 'single') {
      router.push(config.resultPath)
    } else {
      showSnack('success', `1組を追加しました(計${store.setCount}組)`)
    }
  }

  function stepBack() {
    store.stepBack()
  }

  // フッター常設の手入力。submit は MANUAL として現在ステップの値に流す
  const manualOpen = ref(false)
  function openManual() {
    manualOpen.value = true
  }
  function handleManualSubmit(text: string) {
    handleScan({ text, format: 'MANUAL', timestamp: Date.now() })
  }

  function finish() {
    router.push(config.resultPath)
  }
  function cancel() {
    store.reset()
    router.back()
  }

  return {
    steps: config.steps,
    currentStep, currentStepIndex, parts, setCount, canStepBack,
    handleScan, stepBack,
    manualOpen, openManual, handleManualSubmit,
    finish, cancel,
    isContinuous: config.mode === 'continuous',
    title: config.title,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScreenLogic.test.ts`
Expected: PASS(9件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan/logic/useStepScanScreen.ts src/sample/scan/__tests__/stepScreenLogic.test.ts
git commit -m "feat(sample-scan): ステップ式スキャン画面ロジック useStepScanScreen を追加"
```

---

### Task 5: useStepResultScreen(結果画面ロジック)

**Files:**
- Create: `src/sample/scan/logic/useStepResultScreen.ts`
- Test: `src/sample/scan/__tests__/stepScreenLogic.test.ts`(describe 追加)

**Interfaces:**
- Consumes: `useStepScanSessionStore`(Task 3)、`StepScanPatternConfig`(Task 2)、`useSnackbar`
- Produces: `useStepResultScreen(config: StepScanPatternConfig)` の戻り値:
  `sets: ComputedRef<ScanSetItem[]>`, `firstSet: ComputedRef<ScanSetItem | null>`,
  `rescan()`, `confirm()`, `removeSet(i: number)`, `title: string`, `steps: ScanStepDef[]`

- [ ] **Step 1: 失敗するテストを書く**

`stepScreenLogic.test.ts` に import と describe を追加:

```ts
import { useStepResultScreen } from '../logic/useStepResultScreen'
```

```ts
describe('useStepResultScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('セッションなしの直接アクセスはスキャン画面へ replace する', () => {
    useStepResultScreen(getStepPattern('pair-single'))
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/pair-single')
  })

  it('rescan: single は組を破棄して back する(セッション維持)', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-single', 'single')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    store.addPart({ raw: 'B', format: 'X', timestamp: 2, fields: {} })
    store.completeSet()
    const { rescan } = useStepResultScreen(getStepPattern('pair-single'))
    rescan()
    expect(store.setCount).toBe(0)
    expect(store.hasSession).toBe(true)
    expect(mockBack).toHaveBeenCalled()
  })

  it('rescan: continuous は組を保持して back する', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    store.completeSet()
    const { rescan } = useStepResultScreen(getStepPattern('pair-list'))
    rescan()
    expect(store.setCount).toBe(1)
    expect(mockBack).toHaveBeenCalled()
  })

  it('confirm: セッションを reset して索引へ遷移する', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    store.completeSet()
    const { confirm } = useStepResultScreen(getStepPattern('pair-list'))
    confirm()
    expect(store.hasSession).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan')
  })

  it('removeSet で組を削除できる', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    store.completeSet()
    const { removeSet, sets } = useStepResultScreen(getStepPattern('pair-list'))
    removeSet(0)
    expect(sets.value).toHaveLength(0)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScreenLogic.test.ts`
Expected: FAIL(useStepResultScreen が存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/logic/useStepResultScreen.ts`:

```ts
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { StepScanPatternConfig } from './stepPatterns'

/** ステップ式結果画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useStepResultScreen(config: StepScanPatternConfig) {
  const router = useRouter()
  const store = useStepScanSessionStore()
  const { showSnack } = useSnackbar()

  // 直接アクセス(セッションなし・別パターン)はスキャン画面へ
  if (store.patternId !== config.id) {
    router.replace(config.scanPath)
  }

  const sets = computed(() => store.sets)
  const firstSet = computed(() => store.firstSet)

  function rescan() {
    if (config.mode === 'single') store.clearSets()
    router.back()
  }
  function confirm() {
    showSnack('success', `${store.setCount}組を確定しました`)
    store.reset()
    router.push('/sample/scan')
  }
  function removeSet(i: number) {
    store.removeSet(i)
  }

  return {
    sets, firstSet, rescan, confirm, removeSet,
    title: config.title,
    steps: config.steps,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScreenLogic.test.ts`
Expected: PASS(14件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan/logic/useStepResultScreen.ts src/sample/scan/__tests__/stepScreenLogic.test.ts
git commit -m "feat(sample-scan): ステップ式結果画面ロジック useStepResultScreen を追加"
```

---

### Task 6: ScanStepHeader 部品

**Files:**
- Create: `src/sample/scan/components/ScanStepHeader.vue`
- Test: `src/sample/scan/__tests__/ScanStepHeader.test.ts`

**Interfaces:**
- Consumes: `ScanStepDef`(Task 2)、Vuetify `v-stepper` / `v-stepper-header` / `v-stepper-item`(Vuetify 4 標準。テストは `src/test/setup.ts` が全コンポーネント登録済み)
- Produces: props `{ steps: ScanStepDef[]; currentIndex: number }` のみの表示専用部品(store 非依存)。現在ステップの `guide` を `.step-guide` に表示

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanStepHeader.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanStepHeader from '../components/ScanStepHeader.vue'
import { getStepPattern } from '../logic/stepPatterns'

const steps = getStepPattern('pair-single').steps

describe('ScanStepHeader', () => {
  it('全ステップのラベルと現在ステップの案内文を表示する', () => {
    const w = mount(ScanStepHeader, { props: { steps, currentIndex: 0 } })
    expect(w.text()).toContain('バーコード')
    expect(w.text()).toContain('QR/バーコード')
    expect(w.find('.step-guide').text()).toBe(steps[0].guide)
  })

  it('currentIndex に応じて案内文が切り替わる', async () => {
    const w = mount(ScanStepHeader, { props: { steps, currentIndex: 0 } })
    await w.setProps({ currentIndex: 1 })
    expect(w.find('.step-guide').text()).toBe(steps[1].guide)
  })

  it('currentIndex がステップ数以上でも最終ステップの案内文で安全に表示する', () => {
    const w = mount(ScanStepHeader, { props: { steps, currentIndex: 2 } })
    expect(w.find('.step-guide').text()).toBe(steps[1].guide)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanStepHeader.test.ts`
Expected: FAIL(コンポーネントが存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanStepHeader.vue`:

```vue
<template>
  <div class="step-header">
    <v-stepper :model-value="currentIndex + 1" flat class="stepper">
      <v-stepper-header>
        <template v-for="(s, i) in steps" :key="s.key">
          <v-stepper-item :value="i + 1" :title="s.label" :complete="i < currentIndex" />
          <v-divider v-if="i < steps.length - 1" />
        </template>
      </v-stepper-header>
    </v-stepper>
    <p class="step-guide text-body-2 text-center py-1">{{ guide }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScanStepDef } from '../logic/stepPatterns'

const props = defineProps<{ steps: ScanStepDef[]; currentIndex: number }>()

// 組完成の瞬間(currentIndex がステップ数と一致)でも範囲外参照しない
const guide = computed(
  () => props.steps[Math.min(props.currentIndex, props.steps.length - 1)]?.guide ?? '',
)
</script>

<style scoped>
.step-header {
  flex: none;
}
/* カメラ領域を圧迫しないようステッパーを詰める */
.stepper :deep(.v-stepper-item) {
  padding: 8px 16px;
}
</style>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanStepHeader.test.ts`
Expected: PASS(3件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan/components/ScanStepHeader.vue src/sample/scan/__tests__/ScanStepHeader.test.ts
git commit -m "feat(sample-scan): ステップ導線表示部品 ScanStepHeader を追加"
```

---

### Task 7: スキャンページ2枚+ルート

**Files:**
- Create: `src/sample/scan/pages/PairSingleScanPage.vue`
- Create: `src/sample/scan/pages/PairListScanPage.vue`
- Modify: `src/router/index.ts`(list-split ルート群の直後・catch-all より前に2本追加)
- Test: `src/sample/scan/__tests__/stepScanPages.test.ts`

**Interfaces:**
- Consumes: `useStepScanScreen`(Task 4)、`getStepPattern`(Task 2)、`ScanStepHeader`(Task 6)、既存 `ScanFixedLayout` / `ScanCameraView` / `ScanManualInputDialog`
- Produces: ルート `/sample/scan/pair-single`, `/sample/scan/pair-list`。フッターの CSS クラス `step-back-btn`(1つ戻る)・`manual-input-btn`(手入力)は結果検証・テストで使用

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/stepScanPages.test.ts`(既存 `scanPages.test.ts` と同じモック流儀):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { ScanResult } from '@/types/scanner'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

let capturedOnScan: ((r: ScanResult) => void) | null = null
vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: vi.fn(),
      stop: vi.fn(),
      isScanning: ref(false),
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

import PairSingleScanPage from '../pages/PairSingleScanPage.vue'
import PairListScanPage from '../pages/PairListScanPage.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import { getStepPattern } from '../logic/stepPatterns'

const mountOpts = { global: { stubs: { teleport: true } } }
const steps = getStepPattern('pair-single').steps

describe('PairSingleScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('初期表示はステップ①の案内文で、1回読み取るとステップ②に切り替わる', async () => {
    const w = mount(PairSingleScanPage, mountOpts)
    expect(w.find('.step-guide').text()).toBe(steps[0].guide)
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    await w.vm.$nextTick()
    expect(w.find('.step-guide').text()).toBe(steps[1].guide)
    expect(w.text()).toContain('BAR-1')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('2回読み取ると組が保存され結果画面へ遷移する', async () => {
    mount(PairSingleScanPage, mountOpts)
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    capturedOnScan!({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    const store = useStepScanSessionStore()
    expect(store.firstSet?.parts.map((p) => p.raw)).toEqual(['BAR-1', 'QR-1'])
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-single/result')
  })

  it('1つ戻るは初期状態で disabled、1回読み取ると押せて parts が戻る', async () => {
    const w = mount(PairSingleScanPage, mountOpts)
    const backBtn = w.find('.step-back-btn')
    expect(backBtn.attributes('disabled')).toBeDefined()
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    await w.vm.$nextTick()
    expect(w.find('.step-back-btn').attributes('disabled')).toBeUndefined()
    await w.find('.step-back-btn').trigger('click')
    expect(useStepScanSessionStore().parts).toHaveLength(0)
  })

  it('種別メニュー(ScanTypeMenuButton)は表示されない', () => {
    const w = mount(PairSingleScanPage, mountOpts)
    expect(w.findComponent(ScanTypeMenuButton).exists()).toBe(false)
  })

  it('キャンセルでセッション破棄して戻る', async () => {
    const w = mount(PairSingleScanPage, mountOpts)
    const cancelBtn = w.findAll('button').find((b) => b.text().includes('キャンセル'))!
    await cancelBtn.trigger('click')
    expect(useStepScanSessionStore().hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('PairListScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('2回の読取で1組が蓄積され、組数が表示される(遷移しない)', async () => {
    const w = mount(PairListScanPage, mountOpts)
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    capturedOnScan!({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    await w.vm.$nextTick()
    expect(useStepScanSessionStore().setCount).toBe(1)
    expect(w.text()).toContain('読取済み: 1組')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('0組のとき読取完了は disabled、1組以上で結果画面へ遷移できる', async () => {
    const w = mount(PairListScanPage, mountOpts)
    const finishBtn = w.findAll('button').find((b) => b.text().includes('読取完了'))!
    expect(finishBtn.attributes('disabled')).toBeDefined()
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    capturedOnScan!({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    await w.vm.$nextTick()
    await w.findAll('button').find((b) => b.text().includes('読取完了'))!.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-list/result')
  })

  it('手入力ダイアログの submit が現在ステップの値になる', async () => {
    const w = mount(PairListScanPage, mountOpts)
    await w.find('.manual-input-btn').trigger('click')
    const dialog = w.findComponent(ScanManualInputDialog)
    expect(dialog.props('modelValue')).toBe(true)
    dialog.vm.$emit('submit', 'ABC-123')
    await w.vm.$nextTick()
    const store = useStepScanSessionStore()
    expect(store.parts[0].raw).toBe('ABC-123')
    expect(store.parts[0].format).toBe('MANUAL')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScanPages.test.ts`
Expected: FAIL(ページが存在しない)

- [ ] **Step 3: ページ実装**

`src/sample/scan/pages/PairSingleScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanStepHeader :steps="steps" :current-index="currentStepIndex" />
    <ScanCameraView
      :scan-type="currentStep.accept"
      @scan="handleScan"
      @manual-request="openManual"
    />
    <div class="px-4 py-2">
      <p
        v-for="(p, i) in parts"
        :key="`${p.timestamp}-${i}`"
        class="text-caption text-truncate"
      >
        {{ steps[i].label }}: {{ p.raw }}
      </p>
      <p v-if="!parts.length" class="text-caption text-medium-emphasis">
        読み取った値がここに表示されます
      </p>
    </div>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <v-btn class="step-back-btn" :disabled="!canStepBack" @click="stepBack">1つ戻る</v-btn>
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanStepHeader from '../components/ScanStepHeader.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepScanScreen } from '../logic/useStepScanScreen'

const {
  steps, currentStep, currentStepIndex, parts, canStepBack,
  handleScan, stepBack, cancel, title,
  manualOpen, openManual, handleManualSubmit,
} = useStepScanScreen(getStepPattern('pair-single'))
</script>
```

`src/sample/scan/pages/PairListScanPage.vue`(単発版との差分: 組数表示と読取完了ボタン):

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanStepHeader :steps="steps" :current-index="currentStepIndex" />
    <ScanCameraView
      :scan-type="currentStep.accept"
      @scan="handleScan"
      @manual-request="openManual"
    />
    <div class="px-4 py-2">
      <p class="text-subtitle-2">読取済み: {{ setCount }}組</p>
      <p
        v-for="(p, i) in parts"
        :key="`${p.timestamp}-${i}`"
        class="text-caption text-truncate"
      >
        {{ steps[i].label }}: {{ p.raw }}
      </p>
      <p v-if="!parts.length" class="text-caption text-medium-emphasis">
        読み取った値がここに表示されます
      </p>
    </div>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <v-btn class="step-back-btn" :disabled="!canStepBack" @click="stepBack">1つ戻る</v-btn>
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
      <v-btn color="primary" :disabled="!setCount" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanStepHeader from '../components/ScanStepHeader.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepScanScreen } from '../logic/useStepScanScreen'

const {
  steps, currentStep, currentStepIndex, parts, setCount, canStepBack,
  handleScan, stepBack, finish, cancel, title,
  manualOpen, openManual, handleManualSubmit,
} = useStepScanScreen(getStepPattern('pair-list'))
</script>
```

- [ ] **Step 4: ルート追加**

`src/router/index.ts` の `list-split/result/:index` 行の直後(catch-all より前)に追加:

```ts
    { path: '/sample/scan/pair-single', component: () => import('@/sample/scan/pages/PairSingleScanPage.vue') },
    { path: '/sample/scan/pair-list', component: () => import('@/sample/scan/pages/PairListScanPage.vue') },
```

(結果ルート2本は Task 8 でページ作成と同時に追加する)

- [ ] **Step 5: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepScanPages.test.ts`
Expected: PASS(8件)

- [ ] **Step 6: コミット**

```bash
git add src/sample/scan/pages/PairSingleScanPage.vue src/sample/scan/pages/PairListScanPage.vue src/router/index.ts src/sample/scan/__tests__/stepScanPages.test.ts
git commit -m "feat(sample-scan): ステップ式スキャンページ(pair-single/pair-list)とルートを追加"
```

---

### Task 8: 結果ページ2枚+ルート

**Files:**
- Create: `src/sample/scan/pages/PairSingleResultPage.vue`
- Create: `src/sample/scan/pages/PairListResultPage.vue`
- Modify: `src/router/index.ts`(結果ルート2本追加)
- Test: `src/sample/scan/__tests__/stepResultPages.test.ts`

**Interfaces:**
- Consumes: `useStepResultScreen`(Task 5)、`getStepPattern`(Task 2)、既存 `ScanFixedLayout`
- Produces: ルート `/sample/scan/pair-single/result`, `/sample/scan/pair-list/result`。削除ボタンの CSS クラス `remove-btn`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/stepResultPages.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

import PairSingleResultPage from '../pages/PairSingleResultPage.vue'
import PairListResultPage from '../pages/PairListResultPage.vue'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { ScanItem } from '../types'

const mountOpts = { global: { stubs: { teleport: true } } }

const item = (raw: string, format = 'EAN_13'): ScanItem => ({
  raw,
  format,
  timestamp: 1,
  fields: {},
})

function seedSingle() {
  const store = useStepScanSessionStore()
  store.startSession('pair-single', 'single')
  store.addPart(item('BAR-1'))
  store.addPart(item('QR-1', 'QR_CODE'))
  store.completeSet()
  return store
}

function seedList(pairs: Array<[string, string]>) {
  const store = useStepScanSessionStore()
  store.startSession('pair-list', 'continuous')
  for (const [a, b] of pairs) {
    store.addPart(item(a))
    store.addPart(item(b, 'QR_CODE'))
    store.completeSet()
  }
  return store
}

describe('PairSingleResultPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('セッションなしの直接アクセスはスキャン画面へ replace する', () => {
    mount(PairSingleResultPage, mountOpts)
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/pair-single')
  })

  it('組の両方の値がステップのラベル付きで表示される', () => {
    seedSingle()
    const w = mount(PairSingleResultPage, mountOpts)
    expect(w.text()).toContain('バーコード')
    expect(w.text()).toContain('BAR-1')
    expect(w.text()).toContain('QR/バーコード')
    expect(w.text()).toContain('QR-1')
  })

  it('再スキャンで組を破棄して戻り、確定で reset して索引へ', async () => {
    const store = seedSingle()
    const w = mount(PairSingleResultPage, mountOpts)
    const rescanBtn = w.findAll('button').find((b) => b.text().includes('再スキャン'))!
    await rescanBtn.trigger('click')
    expect(store.setCount).toBe(0)
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('PairListResultPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('組ごとのカードが表示され、削除ボタンで組を消せる', async () => {
    const store = seedList([['BAR-1', 'QR-1'], ['BAR-2', 'QR-2']])
    const w = mount(PairListResultPage, mountOpts)
    expect(w.text()).toContain('読取済み: 2組')
    expect(w.text()).toContain('BAR-1')
    expect(w.text()).toContain('QR-2')
    await w.findAll('.remove-btn')[0].trigger('click')
    expect(store.setCount).toBe(1)
    expect(w.text()).not.toContain('BAR-1')
  })

  it('確定でセッションを reset して索引へ遷移する', async () => {
    const store = seedList([['BAR-1', 'QR-1']])
    const w = mount(PairListResultPage, mountOpts)
    const confirmBtn = w.findAll('button').find((b) => b.text().includes('確定'))!
    await confirmBtn.trigger('click')
    expect(store.hasSession).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan')
  })

  it('0組のとき確定は disabled', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    const w = mount(PairListResultPage, mountOpts)
    const confirmBtn = w.findAll('button').find((b) => b.text().includes('確定'))!
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepResultPages.test.ts`
Expected: FAIL(ページが存在しない)

- [ ] **Step 3: ページ実装**

`src/sample/scan/pages/PairSingleResultPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <v-card v-if="firstSet" variant="outlined" class="ma-4">
      <v-card-text>
        <template v-for="(p, i) in firstSet.parts" :key="i">
          <p class="text-overline text-medium-emphasis mb-1">{{ steps[i].label }}</p>
          <p class="text-body-1 font-weight-bold mb-1" style="word-break: break-all">
            {{ p.raw }}
          </p>
          <p class="text-caption text-medium-emphasis mb-3">
            形式: {{ p.format }} / {{ formatTime(p.timestamp) }}
          </p>
        </template>
      </v-card-text>
    </v-card>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!firstSet" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepResultScreen } from '../logic/useStepResultScreen'

const { firstSet, rescan, confirm, title, steps } = useStepResultScreen(
  getStepPattern('pair-single'),
)

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}
</script>
```

`src/sample/scan/pages/PairListResultPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="list-wrap">
      <div class="px-4 py-2">
        <span class="text-subtitle-2">読取済み: {{ sets.length }}組</span>
      </div>
      <div class="card-scroll px-4 pb-4">
        <v-card
          v-for="(s, i) in sets"
          :key="`${s.parts[0]?.timestamp}-${i}`"
          class="mb-2"
          variant="outlined"
        >
          <v-card-text class="py-2 d-flex justify-space-between align-start">
            <div class="min-width-0">
              <p
                v-for="(p, j) in s.parts"
                :key="j"
                class="text-body-2"
                style="word-break: break-all"
              >
                <span class="text-medium-emphasis">{{ steps[j].label }}: </span>{{ p.raw }}
              </p>
            </div>
            <v-btn
              class="remove-btn"
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              aria-label="削除"
              @click="removeSet(i)"
            />
          </v-card-text>
        </v-card>
        <p v-if="!sets.length" class="text-caption text-medium-emphasis pa-4 text-center">
          読み取り結果がありません
        </p>
      </div>
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!sets.length" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepResultScreen } from '../logic/useStepResultScreen'

const { sets, rescan, confirm, removeSet, title, steps } = useStepResultScreen(
  getStepPattern('pair-list'),
)
</script>

<style scoped>
/* 件数バー固定・カード部のみ縦スクロール(ScanItemList と同じ構造) */
.list-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.card-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.min-width-0 {
  min-width: 0;
}
</style>
```

- [ ] **Step 4: ルート追加**

`src/router/index.ts` の Task 7 で足した2行をこの4行に増やす(scan → result の順で並べる):

```ts
    { path: '/sample/scan/pair-single', component: () => import('@/sample/scan/pages/PairSingleScanPage.vue') },
    { path: '/sample/scan/pair-single/result', component: () => import('@/sample/scan/pages/PairSingleResultPage.vue') },
    { path: '/sample/scan/pair-list', component: () => import('@/sample/scan/pages/PairListScanPage.vue') },
    { path: '/sample/scan/pair-list/result', component: () => import('@/sample/scan/pages/PairListResultPage.vue') },
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/stepResultPages.test.ts`
Expected: PASS(6件)

- [ ] **Step 6: コミット**

```bash
git add src/sample/scan/pages/PairSingleResultPage.vue src/sample/scan/pages/PairListResultPage.vue src/router/index.ts src/sample/scan/__tests__/stepResultPages.test.ts
git commit -m "feat(sample-scan): ステップ式結果ページ(pair-single/pair-list)とルートを追加"
```

---

### Task 9: 一覧カード追加・README 更新・全体検証

**Files:**
- Modify: `src/sample/scan/pages/ScanPatternIndexPage.vue`
- Modify: `src/sample/scan/README.md`

**Interfaces:**
- Consumes: `STEP_SCAN_PATTERNS`(Task 2)

- [ ] **Step 1: 一覧ページにステップ式セクションを追加**

`src/sample/scan/pages/ScanPatternIndexPage.vue` の既存 `v-card` ループの直後(`</v-container>` の前)に追加し、script の import に `STEP_SCAN_PATTERNS` を足す:

```vue
      <p class="text-caption text-medium-emphasis mb-4 mt-6">
        ステップ式(複数読み取り)のパターンです。①バーコード → ②QR/バーコードの順に
        読み取り、1組のデータとして扱います。
      </p>
      <v-card
        v-for="p in STEP_SCAN_PATTERNS"
        :key="p.id"
        class="mb-3"
        variant="outlined"
        :to="p.scanPath"
      >
        <v-card-text class="d-flex align-center">
          <v-icon :icon="p.icon" size="32" color="primary" class="mr-4" />
          <div>
            <p class="text-subtitle-2 font-weight-bold">{{ p.title }}</p>
            <p class="text-caption text-medium-emphasis">{{ p.description }}</p>
          </div>
        </v-card-text>
      </v-card>
```

```ts
import { STEP_SCAN_PATTERNS } from '../logic/stepPatterns'
```

- [ ] **Step 2: README 更新**

`src/sample/scan/README.md`:
- パターン表の下にステップ式の表を追加:

```markdown
### ステップ式(複数読み取り)

| id | モード | ステップ |
|---|---|---|
| pair-single | 単発ペア | ①バーコード → ②QR/バーコード(同時待ち受け) |
| pair-list | 連続ペア | ①→②で1組をリストに蓄積し、一括確定 |
```

- 設計ポイントに追記:

```markdown
- ステップ式は stepPatterns.ts(steps 配列)+ useStepScanScreen/useStepResultScreen +
  stepScanSessionStore の別モジュール構成。導線は ScanStepHeader(v-stepper)で表示し、
  ステップの受付種別は accept('qr-or-barcode' は QR+バーコード同時待ち受け)で決まる
```

- 末尾の詳細設計リンクに `docs/superpowers/specs/2026-08-04-step-scan-patterns-design.md` を追加

- [ ] **Step 3: 全テスト+型チェック**

Run: `npm run test:run`
Expected: 全件 PASS(既存+新規。件数が普段の2倍なら `.claude/worktrees` 混入を疑う)

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: ブラウザ確認**

`npm run dev` を起動し、以下を確認(カメラなしでも「疑似スキャン」入力で可):

1. `/sample/scan` にステップ式カード2枚が出る
2. pair-single: ステッパーが①強調→疑似スキャン1回で②へ(チェック付与・案内文切替)→2回目で結果画面に2値表示→再スキャン/確定
3. pair-list: 2回で「1組追加」スナックバー+組数表示→さらに2回で2組→読取完了→一覧カード2枚→削除→確定
4. 「1つ戻る」: ステップ②で押すと①に戻り値が消える。ステップ①(組空)では非活性
5. フッター(pair-list: 4ボタン)が 390px/360px 幅で収まる(DevTools レスポンシブモード)。収まらない場合はラベル短縮で調整
6. カメラなし環境でエラー→手入力ダイアログが自動で開く

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan/pages/ScanPatternIndexPage.vue src/sample/scan/README.md
git commit -m "feat(sample-scan): 一覧にステップ式パターンカードを追加し README を更新"
```
