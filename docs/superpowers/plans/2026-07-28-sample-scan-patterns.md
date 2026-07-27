# スキャン画面パターン集(sample/scan)実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スキャン画面の5典型パターン(単発/連続 × そのまま/分割/API照会)を、薄い Page + 再利用部品 + 外部ロジック ts で `src/sample/scan/` に自己完結モジュールとして整備する。

**Architecture:** 部品(components)は props/emits のみで store 非依存。スキャン画面⇄結果画面の画面またぎはデータ専用 Pinia store(`scanSessionStore`、コールバック禁止)。parser/resolver 等の戦略関数は logic/ に置き両画面から import 共有。各パターンは「スキャン画面 → 結果画面」の2ルート構成。

**Tech Stack:** Vue 3 (`<script setup>` + TS) / Vuetify 3 / Pinia (setup store) / vue-router (hash history) / @zxing/browser(既存 `useBarcodeScanner` 経由) / TanStack vue-query + orval(既存 `useProductDetail` 経由) / vitest + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-07-28-sample-scan-patterns-design.md`

## Global Constraints

- `.vue` ファイルはレイアウトのみ。ロジックは `logic/` の ts に置く
- `scanSessionStore` にはシリアライズ可能なデータのみ。関数・コールバック・Promise を入れない
- 部品(components/)は props/emits のみで通信。store・router を import しない
- ヘッダ/フッタ(ボタンエリア)固定。カメラ高さ 40vh 固定。結果リストは 1件=1カード縦積み+件数バー固定でカード部のみスクロール(横スクロール禁止)
- OCR は「カメラプレビュー+シャッターでダミー文字列 `ITEM01,LOT-A,12` を返す」スタブ。実装差し替え可能な同一インターフェースを保つ
- 既存コード(`ScannerPage`/`scannerStore`/QuickScan 系)には触らない
- テストは `src/sample/scan/__tests__/` に配置。vitest のグローバル setup(`src/test/setup.ts`)が Vuetify/Pinia/vue-query を毎テスト初期化済み
- テスト実行: `npx vitest run <path>`、全体検証: `npm run test:run` と `npm run type-check`

---

### Task 1: 型定義と parsers(値の加工)

**Files:**
- Create: `src/sample/scan/types/index.ts`
- Create: `src/sample/scan/logic/parsers.ts`
- Test: `src/sample/scan/__tests__/parsers.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `ScanType = 'qr' | 'barcode' | 'ocr'`
  - `ScanSessionMode = 'single' | 'continuous'`
  - `ScanFieldDef { key: string; label: string }`
  - `ScanItem { raw: string; format: string; timestamp: number; fields: Record<string, string> }`
  - `ScanParser = (raw: string) => Record<string, string>`
  - `passthroughParser: ScanParser`(常に `{}`)
  - `createSplitParser(keys: string[], delimiter = ','): ScanParser`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/parsers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { passthroughParser, createSplitParser } from '../logic/parsers'

describe('parsers', () => {
  it('passthroughParser は常に空オブジェクトを返す', () => {
    expect(passthroughParser('ITEM01,LOT-A,12')).toEqual({})
  })

  it('createSplitParser はカンマ区切りで各キーに割り当てる', () => {
    const parse = createSplitParser(['productCode', 'lot', 'qty'])
    expect(parse('ITEM01,LOT-A,12')).toEqual({
      productCode: 'ITEM01',
      lot: 'LOT-A',
      qty: '12',
    })
  })

  it('要素が不足する場合は空文字で埋める', () => {
    const parse = createSplitParser(['productCode', 'lot', 'qty'])
    expect(parse('ITEM01')).toEqual({ productCode: 'ITEM01', lot: '', qty: '' })
  })

  it('各要素の前後空白は除去する', () => {
    const parse = createSplitParser(['a', 'b'])
    expect(parse(' X , Y ')).toEqual({ a: 'X', b: 'Y' })
  })

  it('区切り文字を指定できる', () => {
    const parse = createSplitParser(['a', 'b'], '|')
    expect(parse('X|Y')).toEqual({ a: 'X', b: 'Y' })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/parsers.test.ts`
Expected: FAIL(`parsers.ts` が存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/types/index.ts`:

```ts
export type ScanType = 'qr' | 'barcode' | 'ocr'
export type ScanSessionMode = 'single' | 'continuous'

/** 分割表示・フォーム項目の定義(ラベル+格納キー) */
export interface ScanFieldDef {
  key: string
  label: string
}

/** 読取1件分。store に入れるためシリアライズ可能な値のみ */
export interface ScanItem {
  raw: string
  format: string
  timestamp: number
  /** parser の分割結果。passthrough の場合は空オブジェクト */
  fields: Record<string, string>
}
```

`src/sample/scan/logic/parsers.ts`:

```ts
/** 値の加工戦略。store には入れず、利用画面が import して使う */
export type ScanParser = (raw: string) => Record<string, string>

export const passthroughParser: ScanParser = () => ({})

export function createSplitParser(keys: string[], delimiter = ','): ScanParser {
  return (raw) => {
    const parts = raw.split(delimiter)
    return Object.fromEntries(keys.map((k, i) => [k, parts[i]?.trim() ?? '']))
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/parsers.test.ts`
Expected: PASS(5件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 型定義と値加工 parser(passthrough/split)を追加"
```

---

### Task 2: scanSessionStore(画面またぎ用データ専用 store)

**Files:**
- Create: `src/sample/scan/stores/scanSessionStore.ts`
- Test: `src/sample/scan/__tests__/scanSessionStore.test.ts`

**Interfaces:**
- Consumes: Task 1 の `ScanItem`, `ScanSessionMode`, `ScanType`
- Produces: `useScanSessionStore()`(Pinia setup store, id: `'sampleScanSession'`)
  - state: `patternId: Ref<string | null>`, `mode: Ref<ScanSessionMode>`, `scanType: Ref<ScanType>`, `items: Ref<ScanItem[]>`
  - getters: `hasSession: boolean`, `count: number`, `latest: ScanItem | null`(末尾), `single: ScanItem | null`(先頭)
  - actions: `startSession(id: string, mode: ScanSessionMode)`, `setScanType(t: ScanType)`, `setSingleResult(item: ScanItem)`, `addItem(item: ScanItem)`, `removeItem(index: number)`, `clearItems()`, `reset()`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/scanSessionStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanItem } from '../types'

const item = (raw: string, timestamp = 1): ScanItem => ({
  raw,
  format: 'EAN_13',
  timestamp,
  fields: {},
})

describe('scanSessionStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('初期状態はセッションなし', () => {
    const store = useScanSessionStore()
    expect(store.hasSession).toBe(false)
    expect(store.count).toBe(0)
  })

  it('startSession でパターン/モードを設定し items をクリアする', () => {
    const store = useScanSessionStore()
    store.addItem(item('old'))
    store.startSession('list-raw', 'continuous')
    expect(store.patternId).toBe('list-raw')
    expect(store.mode).toBe('continuous')
    expect(store.items).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('setSingleResult は items を1件に置き換える', () => {
    const store = useScanSessionStore()
    store.addItem(item('A'))
    store.setSingleResult(item('B'))
    expect(store.items).toHaveLength(1)
    expect(store.single?.raw).toBe('B')
  })

  it('addItem は末尾に追加し latest が末尾を返す', () => {
    const store = useScanSessionStore()
    store.addItem(item('A', 1))
    store.addItem(item('B', 2))
    expect(store.count).toBe(2)
    expect(store.latest?.raw).toBe('B')
  })

  it('removeItem は指定 index を削除する', () => {
    const store = useScanSessionStore()
    store.addItem(item('A'))
    store.addItem(item('B'))
    store.removeItem(0)
    expect(store.items.map((i) => i.raw)).toEqual(['B'])
  })

  it('clearItems は items のみ空にしセッションは維持する', () => {
    const store = useScanSessionStore()
    store.startSession('single-raw', 'single')
    store.addItem(item('A'))
    store.clearItems()
    expect(store.items).toHaveLength(0)
    expect(store.hasSession).toBe(true)
  })

  it('reset でセッション終了(patternId/items が消える)', () => {
    const store = useScanSessionStore()
    store.startSession('single-raw', 'single')
    store.addItem(item('A'))
    store.reset()
    expect(store.hasSession).toBe(false)
    expect(store.items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/scanSessionStore.test.ts`
Expected: FAIL(store が存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/stores/scanSessionStore.ts`:

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ScanItem, ScanSessionMode, ScanType } from '../types'

/**
 * スキャン画面⇄結果画面の画面またぎ専用 store。
 * シリアライズ可能なデータのみ保持する(コールバック・関数は入れない)。
 */
export const useScanSessionStore = defineStore('sampleScanSession', () => {
  const patternId = ref<string | null>(null)
  const mode = ref<ScanSessionMode>('single')
  const scanType = ref<ScanType>('barcode')
  const items = ref<ScanItem[]>([])

  const hasSession = computed(() => patternId.value !== null)
  const count = computed(() => items.value.length)
  const latest = computed(() => items.value[items.value.length - 1] ?? null)
  const single = computed(() => items.value[0] ?? null)

  function startSession(id: string, m: ScanSessionMode) {
    patternId.value = id
    mode.value = m
    items.value = []
  }
  function setScanType(t: ScanType) {
    scanType.value = t
  }
  function setSingleResult(item: ScanItem) {
    items.value = [item]
  }
  function addItem(item: ScanItem) {
    items.value = [...items.value, item]
  }
  function removeItem(index: number) {
    items.value = items.value.filter((_, i) => i !== index)
  }
  function clearItems() {
    items.value = []
  }
  function reset() {
    patternId.value = null
    items.value = []
  }

  return {
    patternId, mode, scanType, items,
    hasSession, count, latest, single,
    startSession, setScanType, setSingleResult, addItem, removeItem, clearItems, reset,
  }
})
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/scanSessionStore.test.ts`
Expected: PASS(7件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 画面またぎ用データ専用 scanSessionStore を追加"
```

---

### Task 3: useScanEngine(読取エンジン抽象化 + OCR スタブ)

**Files:**
- Create: `src/sample/scan/logic/useScanEngine.ts`
- Test: `src/sample/scan/__tests__/useScanEngine.test.ts`

**Interfaces:**
- Consumes: 既存 `@/composables/useBarcodeScanner`(`useBarcodeScanner(videoRef, { onScan, formats? })` → `{ start, stop, isScanning, error, torchAvailable, switchTorch }`)、既存 `@/types/scanner` の `ScanResult { text, format, timestamp }`、Task 1 の `ScanType`
- Produces:
  - `useScanEngine(videoRef: Ref<HTMLVideoElement | null>, scanType: Ref<ScanType>, onScan: (r: ScanResult) => void)` → `{ start(), stop(), restart(), captureOcr(), isOcr: ComputedRef<boolean>, isScanning: Ref<boolean>, error: Ref<string | null>, torchAvailable: Ref<boolean>, switchTorch(on: boolean): Promise<void> }`
  - `QR_FORMATS: BarcodeFormat[]`, `BARCODE_FORMATS: BarcodeFormat[]`, `OCR_DUMMY_TEXT = 'ITEM01,LOT-A,12'`

設計メモ: カメラプレビューは全種別で必須のため、OCR モードでも zxing のカメラは起動し続け、**デコード結果だけ無視**する。OCR の読取は `captureOcr()`(シャッター)がダミー文字列を `format: 'OCR'` で通知するスタブ。実案件では `captureOcr` の中身を Tesseract 等に差し替える。

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/useScanEngine.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { ScanResult } from '@/types/scanner'
import type { ScanType } from '../types'

const mockStart = vi.fn()
const mockStop = vi.fn()
let capturedOptions: {
  onScan: (r: ScanResult) => void
  formats?: () => unknown[]
} | null = null

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOptions = options
    return {
      start: mockStart,
      stop: mockStop,
      isScanning: ref(false),
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

import { useScanEngine, QR_FORMATS, BARCODE_FORMATS, OCR_DUMMY_TEXT } from '../logic/useScanEngine'

function setup(type: ScanType) {
  const scanType = ref<ScanType>(type)
  const onScan = vi.fn()
  const engine = useScanEngine(ref(null) as Ref<HTMLVideoElement | null>, scanType, onScan)
  return { scanType, onScan, engine }
}

describe('useScanEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOptions = null
  })

  it('qr のとき formats は QR_FORMATS を返す', () => {
    setup('qr')
    expect(capturedOptions!.formats!()).toEqual(QR_FORMATS)
  })

  it('barcode のとき formats は BARCODE_FORMATS を返す', () => {
    setup('barcode')
    expect(capturedOptions!.formats!()).toEqual(BARCODE_FORMATS)
  })

  it('zxing の読取は barcode/qr のとき通知され ocr のとき無視される', () => {
    const { scanType, onScan } = setup('barcode')
    capturedOptions!.onScan({ text: 'A', format: 'EAN_13', timestamp: 1 })
    expect(onScan).toHaveBeenCalledTimes(1)
    scanType.value = 'ocr'
    capturedOptions!.onScan({ text: 'B', format: 'EAN_13', timestamp: 2 })
    expect(onScan).toHaveBeenCalledTimes(1) // 増えない
  })

  it('captureOcr は ocr のときダミー文字列を format OCR で通知する', () => {
    const { onScan, engine } = setup('ocr')
    engine.captureOcr()
    expect(onScan).toHaveBeenCalledWith(
      expect.objectContaining({ text: OCR_DUMMY_TEXT, format: 'OCR' }),
    )
  })

  it('captureOcr は ocr 以外では何もしない', () => {
    const { onScan, engine } = setup('barcode')
    engine.captureOcr()
    expect(onScan).not.toHaveBeenCalled()
  })

  it('start/stop/restart は zxing scanner に委譲する', () => {
    const { engine } = setup('barcode')
    engine.start()
    expect(mockStart).toHaveBeenCalledTimes(1)
    engine.restart()
    expect(mockStop).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/useScanEngine.test.ts`
Expected: FAIL(`useScanEngine.ts` が存在しない)
※ `onUnmounted` の Vue 警告がコンソールに出るが無害(既存 `useBarcodeScanner` のモックにより実際は登録されない)

- [ ] **Step 3: 実装**

`src/sample/scan/logic/useScanEngine.ts`:

```ts
import { computed } from 'vue'
import type { Ref } from 'vue'
import { BarcodeFormat } from '@zxing/browser'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanResult } from '@/types/scanner'
import type { ScanType } from '../types'

export const QR_FORMATS: BarcodeFormat[] = [BarcodeFormat.QR_CODE]
export const BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
]

/** OCR スタブが返す固定文字列(split parser でそのまま分割できる形) */
export const OCR_DUMMY_TEXT = 'ITEM01,LOT-A,12'

/**
 * 読取エンジンの抽象化。
 * qr/barcode: zxing(既存 useBarcodeScanner)に委譲。
 * ocr: プレビューは zxing のカメラを流用しデコード結果は無視、
 *      captureOcr()(シャッター)がダミー文字列を返すスタブ。
 *      実案件では captureOcr の中身を Tesseract 等に差し替える。
 */
export function useScanEngine(
  videoRef: Ref<HTMLVideoElement | null>,
  scanType: Ref<ScanType>,
  onScan: (result: ScanResult) => void,
) {
  const scanner = useBarcodeScanner(videoRef, {
    onScan: (r) => {
      if (scanType.value === 'ocr') return
      onScan(r)
    },
    formats: () => (scanType.value === 'qr' ? QR_FORMATS : BARCODE_FORMATS),
  })

  const isOcr = computed(() => scanType.value === 'ocr')

  function start() {
    scanner.start()
  }
  function stop() {
    scanner.stop()
  }
  // formats は start 時に固定されるため、種別変更時は再起動が必要
  function restart() {
    stop()
    start()
  }
  function captureOcr() {
    if (!isOcr.value) return
    onScan({ text: OCR_DUMMY_TEXT, format: 'OCR', timestamp: Date.now() })
  }

  return {
    start, stop, restart, captureOcr, isOcr,
    isScanning: scanner.isScanning,
    error: scanner.error,
    torchAvailable: scanner.torchAvailable,
    switchTorch: scanner.switchTorch,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/useScanEngine.test.ts`
Expected: PASS(6件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 読取エンジン抽象化 useScanEngine を追加(zxing 委譲 + OCR スタブ)"
```

---

### Task 4: パターン定義(patterns.ts)

**Files:**
- Create: `src/sample/scan/logic/patterns.ts`
- Test: `src/sample/scan/__tests__/patterns.test.ts`

**Interfaces:**
- Consumes: Task 1 の `ScanFieldDef`, `ScanSessionMode`, `ScanParser`, `passthroughParser`, `createSplitParser`
- Produces:
  - `ScanPatternConfig { id, title, description, icon, mode: ScanSessionMode, fields: ScanFieldDef[], parser: ScanParser, resolve: 'raw' | 'api', scanPath: string, resultPath: string }`
  - `SPLIT_FIELDS: ScanFieldDef[]`(productCode=商品コード / lot=ロット / qty=数量)
  - `SCAN_PATTERNS: ScanPatternConfig[]`(single-raw / single-split / single-lookup / list-raw / list-split の5件)
  - `getPattern(id: string): ScanPatternConfig`(未知 id は throw)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/patterns.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SCAN_PATTERNS, SPLIT_FIELDS, getPattern } from '../logic/patterns'

describe('patterns', () => {
  it('5パターンが定義されている', () => {
    expect(SCAN_PATTERNS.map((p) => p.id)).toEqual([
      'single-raw',
      'single-split',
      'single-lookup',
      'list-raw',
      'list-split',
    ])
  })

  it('ルートパスは /sample/scan/<id> と /sample/scan/<id>/result', () => {
    for (const p of SCAN_PATTERNS) {
      expect(p.scanPath).toBe(`/sample/scan/${p.id}`)
      expect(p.resultPath).toBe(`/sample/scan/${p.id}/result`)
    }
  })

  it('split 系パターンの parser は SPLIT_FIELDS のキーへ分割する', () => {
    const p = getPattern('list-split')
    expect(p.parser('ITEM01,LOT-A,12')).toEqual({
      productCode: 'ITEM01',
      lot: 'LOT-A',
      qty: '12',
    })
    expect(p.fields).toEqual(SPLIT_FIELDS)
  })

  it('raw 系パターンの parser は空オブジェクトを返し fields は空', () => {
    const p = getPattern('single-raw')
    expect(p.parser('ABC')).toEqual({})
    expect(p.fields).toEqual([])
  })

  it('getPattern は未知 id で throw する', () => {
    expect(() => getPattern('nope')).toThrow()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/patterns.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/logic/patterns.ts`:

```ts
import type { ScanFieldDef, ScanSessionMode } from '../types'
import { createSplitParser, passthroughParser } from './parsers'
import type { ScanParser } from './parsers'

/**
 * パターン定義。parser(関数)を含むため store には入れない。
 * スキャン画面・結果画面の両方がここから import して共有する。
 */
export interface ScanPatternConfig {
  id: string
  title: string
  description: string
  icon: string
  mode: ScanSessionMode
  /** 空配列 = raw のまま扱う。非空 = 分割してこの項目定義で表示する */
  fields: ScanFieldDef[]
  parser: ScanParser
  resolve: 'raw' | 'api'
  scanPath: string
  resultPath: string
}

export const SPLIT_FIELDS: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]

const splitParser = createSplitParser(SPLIT_FIELDS.map((f) => f.key))

function paths(id: string) {
  return { scanPath: `/sample/scan/${id}`, resultPath: `/sample/scan/${id}/result` }
}

export const SCAN_PATTERNS: ScanPatternConfig[] = [
  {
    id: 'single-raw',
    title: '単発 × そのまま',
    description: '1件読み取り、値をそのまま結果画面に表示',
    icon: 'mdi-barcode-scan',
    mode: 'single',
    fields: [],
    parser: passthroughParser,
    resolve: 'raw',
    ...paths('single-raw'),
  },
  {
    id: 'single-split',
    title: '単発 × 分割',
    description: '1件読み取り、値を分割して複数項目へ自動代入',
    icon: 'mdi-format-columns',
    mode: 'single',
    fields: SPLIT_FIELDS,
    parser: splitParser,
    resolve: 'raw',
    ...paths('single-split'),
  },
  {
    id: 'single-lookup',
    title: '単発 × API照会',
    description: '1件読み取り、値を商品コードとして API 照会し詳細表示',
    icon: 'mdi-database-search',
    mode: 'single',
    fields: [],
    parser: passthroughParser,
    resolve: 'api',
    ...paths('single-lookup'),
  },
  {
    id: 'list-raw',
    title: '連続 × そのまま',
    description: '連続読み取りでリストに蓄積し、一括確定',
    icon: 'mdi-playlist-plus',
    mode: 'continuous',
    fields: [],
    parser: passthroughParser,
    resolve: 'raw',
    ...paths('list-raw'),
  },
  {
    id: 'list-split',
    title: '連続 × 分割',
    description: '連続読み取りで値を分割し、項目付きカードで蓄積',
    icon: 'mdi-view-list',
    mode: 'continuous',
    fields: SPLIT_FIELDS,
    parser: splitParser,
    resolve: 'raw',
    ...paths('list-split'),
  },
]

export function getPattern(id: string): ScanPatternConfig {
  const p = SCAN_PATTERNS.find((x) => x.id === id)
  if (!p) throw new Error(`unknown scan pattern: ${id}`)
  return p
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/patterns.test.ts`
Expected: PASS(5件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 5パターンの定義 patterns.ts を追加"
```

---

### Task 5: 表示部品(レイアウト・タブ・概要・結果カード)

**Files:**
- Create: `src/sample/scan/components/ScanFixedLayout.vue`
- Create: `src/sample/scan/components/ScanTypeTabs.vue`
- Create: `src/sample/scan/components/ScanSummaryBar.vue`
- Create: `src/sample/scan/components/ScanResultCard.vue`
- Test: `src/sample/scan/__tests__/components.test.ts`

**Interfaces:**
- Consumes: 既存 `@/components/layout/SubLayout.vue`(props: `title: string`、slots: default / `footer` / `actions`)、Task 1 の型
- Produces:
  - `ScanFixedLayout`: props `{ title: string }`、slots: default(固定領域・内部スクロール前提)+ `footer`(固定ボタンエリア)
  - `ScanTypeTabs`: props `{ modelValue: ScanType }`、emits `update:modelValue(ScanType)`
  - `ScanSummaryBar`: props `{ count: number; latest: ScanItem | null; fields: ScanFieldDef[] }`
  - `ScanResultCard`: props `{ item: ScanItem }`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/components.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanResultCard from '../components/ScanResultCard.vue'
import type { ScanItem } from '../types'

const item: ScanItem = {
  raw: 'ITEM01,LOT-A,12',
  format: 'QR_CODE',
  timestamp: 1000,
  fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
}

describe('ScanTypeTabs', () => {
  it('3種別のタブを表示し、クリックで update:modelValue を emit する', async () => {
    const w = mount(ScanTypeTabs, { props: { modelValue: 'barcode' as const } })
    const tabs = w.findAll('.v-tab')
    expect(tabs).toHaveLength(3)
    await tabs[0].trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['qr'])
  })
})

describe('ScanSummaryBar', () => {
  it('件数と直近1件(fields 指定時はラベル値連結)を表示する', () => {
    const w = mount(ScanSummaryBar, {
      props: {
        count: 3,
        latest: item,
        fields: [
          { key: 'productCode', label: '商品コード' },
          { key: 'lot', label: 'ロット' },
        ],
      },
    })
    expect(w.text()).toContain('読取済み: 3件')
    expect(w.text()).toContain('ITEM01 / LOT-A')
  })

  it('fields が空なら直近は raw を表示する', () => {
    const w = mount(ScanSummaryBar, { props: { count: 1, latest: item, fields: [] } })
    expect(w.text()).toContain('ITEM01,LOT-A,12')
  })
})

describe('ScanResultCard', () => {
  it('raw と形式を表示する', () => {
    const w = mount(ScanResultCard, { props: { item } })
    expect(w.text()).toContain('ITEM01,LOT-A,12')
    expect(w.text()).toContain('QR_CODE')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/components.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanFixedLayout.vue`:

```vue
<template>
  <SubLayout :title="title">
    <div class="scan-fixed">
      <slot />
    </div>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </SubLayout>
</template>

<script setup lang="ts">
import SubLayout from '@/components/layout/SubLayout.vue'

defineProps<{ title: string }>()
</script>

<style scoped>
/* ページ全体はスクロールさせず、内側(リスト等)だけがスクロールする */
.scan-fixed {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
```

`src/sample/scan/components/ScanTypeTabs.vue`:

```vue
<template>
  <v-tabs
    :model-value="modelValue"
    density="compact"
    grow
    color="primary"
    @update:model-value="emit('update:modelValue', $event as ScanType)"
  >
    <v-tab value="qr">QR</v-tab>
    <v-tab value="barcode">バーコード</v-tab>
    <v-tab value="ocr">OCR</v-tab>
  </v-tabs>
</template>

<script setup lang="ts">
import type { ScanType } from '../types'

defineProps<{ modelValue: ScanType }>()
const emit = defineEmits<{ 'update:modelValue': [value: ScanType] }>()
</script>
```

`src/sample/scan/components/ScanSummaryBar.vue`:

```vue
<template>
  <div class="px-4 py-2">
    <p class="text-subtitle-2">読取済み: {{ count }}件</p>
    <p v-if="latest" class="text-caption text-medium-emphasis text-truncate">
      直近: {{ latestText }}
    </p>
    <p v-else class="text-caption text-medium-emphasis">読み取り結果がここに表示されます</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScanFieldDef, ScanItem } from '../types'

const props = defineProps<{
  count: number
  latest: ScanItem | null
  fields: ScanFieldDef[]
}>()

const latestText = computed(() => {
  const item = props.latest
  if (!item) return ''
  if (!props.fields.length) return item.raw
  return props.fields.map((f) => item.fields[f.key] ?? '').join(' / ')
})
</script>
```

`src/sample/scan/components/ScanResultCard.vue`:

```vue
<template>
  <v-card variant="outlined" class="ma-4">
    <v-card-text>
      <p class="text-overline text-medium-emphasis mb-1">読取値</p>
      <p class="text-body-1 font-weight-bold mb-3" style="word-break: break-all">
        {{ item.raw }}
      </p>
      <p class="text-caption text-medium-emphasis">形式: {{ item.format }}</p>
      <p class="text-caption text-medium-emphasis">時刻: {{ time }}</p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScanItem } from '../types'

const props = defineProps<{ item: ScanItem }>()
const time = computed(() => new Date(props.item.timestamp).toLocaleTimeString())
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/components.test.ts`
Expected: PASS(4件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 固定レイアウト・種別タブ・概要バー・結果カード部品を追加"
```

---

### Task 6: ScanItemList(カード縦積みリスト)

**Files:**
- Create: `src/sample/scan/components/ScanItemList.vue`
- Test: `src/sample/scan/__tests__/ScanItemList.test.ts`

**Interfaces:**
- Consumes: Task 1 の `ScanItem`, `ScanFieldDef`
- Produces: `ScanItemList`: props `{ items: ScanItem[]; fields: ScanFieldDef[] }`、emits `remove(index: number)` / `clear()`。件数バー上部固定+カード部のみスクロール。1件=1カード縦積み(横スクロールなし)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanItemList.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanItemList from '../components/ScanItemList.vue'
import type { ScanFieldDef, ScanItem } from '../types'

const items: ScanItem[] = [
  {
    raw: 'ITEM01,LOT-A,12',
    format: 'QR_CODE',
    timestamp: 1000,
    fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
  },
  {
    raw: 'ITEM02,LOT-B,5',
    format: 'QR_CODE',
    timestamp: 2000,
    fields: { productCode: 'ITEM02', lot: 'LOT-B', qty: '5' },
  },
]
const fields: ScanFieldDef[] = [
  { key: 'productCode', label: '商品コード' },
  { key: 'lot', label: 'ロット' },
  { key: 'qty', label: '数量' },
]

describe('ScanItemList', () => {
  it('件数バーに件数を表示し、1件=1カードで縦に並ぶ', () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    expect(w.text()).toContain('読取済み: 2件')
    expect(w.findAll('.scan-item-card')).toHaveLength(2)
  })

  it('fields 指定時はカード内にラベル付きで縦表示する', () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    expect(w.text()).toContain('商品コード: ITEM01')
    expect(w.text()).toContain('ロット: LOT-A')
    expect(w.text()).toContain('数量: 12')
  })

  it('fields が空なら raw と形式を表示する', () => {
    const w = mount(ScanItemList, { props: { items, fields: [] } })
    expect(w.text()).toContain('読取値: ITEM01,LOT-A,12')
    expect(w.text()).toContain('QR_CODE')
  })

  it('削除ボタンで remove(index) を emit する', async () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    await w.findAll('.remove-btn')[1].trigger('click')
    expect(w.emitted('remove')?.[0]).toEqual([1])
  })

  it('クリアボタンで clear を emit する', async () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    await w.find('.clear-btn').trigger('click')
    expect(w.emitted('clear')).toHaveLength(1)
  })

  it('0件のとき空メッセージを表示しクリアボタンは出ない', () => {
    const w = mount(ScanItemList, { props: { items: [], fields } })
    expect(w.text()).toContain('読み取り結果がありません')
    expect(w.find('.clear-btn').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanItemList.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanItemList.vue`:

```vue
<template>
  <div class="list-wrap">
    <div class="count-bar d-flex align-center justify-space-between px-4 py-2">
      <span class="text-subtitle-2">読取済み: {{ items.length }}件</span>
      <v-btn
        v-if="items.length"
        class="clear-btn"
        variant="text"
        color="error"
        size="small"
        @click="emit('clear')"
      >クリア</v-btn>
    </div>

    <div class="card-scroll px-4 pb-4">
      <v-card
        v-for="(item, i) in items"
        :key="`${item.timestamp}-${i}`"
        class="scan-item-card mb-2"
        variant="outlined"
      >
        <v-card-text class="py-2 d-flex justify-space-between align-start">
          <div class="min-width-0">
            <template v-if="fields.length">
              <p v-for="f in fields" :key="f.key" class="text-body-2">
                <span class="text-medium-emphasis">{{ f.label }}: </span>{{ item.fields[f.key] ?? '' }}
              </p>
            </template>
            <template v-else>
              <p class="text-body-2" style="word-break: break-all">読取値: {{ item.raw }}</p>
              <p class="text-caption text-medium-emphasis">
                形式: {{ item.format }} / {{ formatTime(item.timestamp) }}
              </p>
            </template>
          </div>
          <v-btn
            class="remove-btn"
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            @click="emit('remove', i)"
          />
        </v-card-text>
      </v-card>

      <p v-if="!items.length" class="text-caption text-medium-emphasis pa-4 text-center">
        読み取り結果がありません
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScanFieldDef, ScanItem } from '../types'

defineProps<{
  items: ScanItem[]
  fields: ScanFieldDef[]
}>()
const emit = defineEmits<{ remove: [index: number]; clear: [] }>()

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}
</script>

<style scoped>
/* 件数バー固定・カード部のみ縦スクロール(横スクロールなし) */
.list-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.count-bar {
  flex: none;
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

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanItemList.test.ts`
Expected: PASS(6件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): カード縦積みリスト ScanItemList を追加(件数バー固定・カード部スクロール)"
```

---

### Task 7: ScanCameraView(カメラプレビュー部品)

**Files:**
- Create: `src/sample/scan/components/ScanCameraView.vue`
- Test: `src/sample/scan/__tests__/ScanCameraView.test.ts`

**Interfaces:**
- Consumes: Task 3 の `useScanEngine`、Task 1 の `ScanType`、既存 `ScanResult`
- Produces: `ScanCameraView`: props `{ scanType: ScanType }`、emits `scan(result: ScanResult)`。カメラ高さ 40vh 固定。OCR 時シャッターボタン、トーチ、権限エラー表示、DEV 時のみ疑似スキャン入力を内包

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanCameraView.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { ScanResult } from '@/types/scanner'

const mockStart = vi.fn()
const mockStop = vi.fn()
let capturedOnScan: ((r: ScanResult) => void) | null = null

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: mockStart,
      stop: mockStop,
      isScanning: ref(false),
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

import ScanCameraView from '../components/ScanCameraView.vue'
import { OCR_DUMMY_TEXT } from '../logic/useScanEngine'

describe('ScanCameraView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('マウント時にカメラを起動する', () => {
    mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(mockStart).toHaveBeenCalled()
  })

  it('zxing の読取で scan を emit する', () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(w.emitted('scan')?.[0]).toEqual([
      { text: '4901234567890', format: 'EAN_13', timestamp: 1 },
    ])
  })

  it('ocr のときシャッターボタンが表示され、押すとダミー文字列を emit する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'ocr' as const } })
    const shutter = w.find('.shutter-btn')
    expect(shutter.exists()).toBe(true)
    await shutter.trigger('click')
    const emitted = w.emitted('scan')?.[0]?.[0] as ScanResult
    expect(emitted.text).toBe(OCR_DUMMY_TEXT)
    expect(emitted.format).toBe('OCR')
  })

  it('barcode のときシャッターボタンは表示されない', () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(w.find('.shutter-btn').exists()).toBe(false)
  })

  it('種別変更でエンジンを再起動する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockStart.mockClear()
    await w.setProps({ scanType: 'qr' })
    expect(mockStop).toHaveBeenCalled()
    expect(mockStart).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanCameraView.vue`:

```vue
<template>
  <div class="camera-wrap">
    <video ref="videoRef" class="camera-video" autoplay muted playsinline />
    <div class="camera-frame" />

    <v-btn
      v-if="torchAvailable && !isOcr"
      class="torch-btn"
      :icon="torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight'"
      size="small"
      @click="toggleTorch"
    />
    <v-btn
      v-if="isOcr"
      class="shutter-btn"
      icon="mdi-camera"
      size="large"
      color="primary"
      @click="captureOcr"
    />

    <v-alert v-if="error" class="camera-error" type="error" density="compact">
      {{ error }}
    </v-alert>

    <div v-if="isDev" class="dev-sim">
      <v-text-field
        v-model="simText"
        label="開発用: 疑似スキャン"
        density="compact"
        hide-details
        bg-color="surface"
        append-inner-icon="mdi-send"
        @click:append-inner="simulate"
        @keydown.enter="simulate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toRef, watch } from 'vue'
import type { ScanResult } from '@/types/scanner'
import type { ScanType } from '../types'
import { useScanEngine } from '../logic/useScanEngine'

const props = defineProps<{ scanType: ScanType }>()
const emit = defineEmits<{ scan: [result: ScanResult] }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const engine = useScanEngine(videoRef, toRef(props, 'scanType'), (r) => emit('scan', r))
const { error, torchAvailable, isOcr, captureOcr } = engine

onMounted(engine.start)
watch(() => props.scanType, () => engine.restart())

const torchOn = ref(false)
async function toggleTorch() {
  torchOn.value = !torchOn.value
  await engine.switchTorch(torchOn.value)
}

// ブラウザ開発時にカメラなしで動作確認するための疑似入力
const isDev = import.meta.env.DEV
const simText = ref('')
function simulate() {
  if (!simText.value) return
  emit('scan', { text: simText.value, format: 'DEV', timestamp: Date.now() })
  simText.value = ''
}
</script>

<style scoped>
.camera-wrap {
  position: relative;
  height: 40vh;
  flex: none;
  background: #000;
}
.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.camera-frame {
  position: absolute;
  inset: 15% 10%;
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  pointer-events: none;
}
.torch-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}
.shutter-btn {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
}
.camera-error {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
}
.dev-sim {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 8px;
}
</style>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts`
Expected: PASS(5件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): カメラプレビュー部品 ScanCameraView を追加(OCR シャッター・疑似スキャン付き)"
```

---

### Task 8: 画面ロジック(useScanScreen / useResultScreen)

**Files:**
- Create: `src/sample/scan/logic/useScanScreen.ts`
- Create: `src/sample/scan/logic/useResultScreen.ts`
- Test: `src/sample/scan/__tests__/screenLogic.test.ts`

**Interfaces:**
- Consumes: Task 2 の store、Task 4 の `ScanPatternConfig` / `getPattern`、既存 `useSnackbar`(`showSnack(color, text)`)、`vue-router` の `useRouter`
- Produces:
  - `useScanScreen(config: ScanPatternConfig)` → `{ scanType: WritableComputedRef<ScanType>, count: ComputedRef<number>, latest: ComputedRef<ScanItem | null>, handleScan(r: ScanResult), finish(), cancel(), isContinuous: boolean, title: string, fields: ScanFieldDef[] }`
  - `useResultScreen(config: ScanPatternConfig)` → `{ items: ComputedRef<ScanItem[]>, single: ComputedRef<ScanItem | null>, rescan(), confirm(), removeItem(i), clearItems(), title: string, fields: ScanFieldDef[] }`

動作仕様:
- `useScanScreen`: setup 時に `store.patternId !== config.id` なら `startSession`(結果画面から再スキャンで戻った同一パターンはセッション継続)。`handleScan` は single なら `setSingleResult` + `push(resultPath)`、continuous なら `addItem` のみ。item の `fields` は `config.parser(raw)` で生成
- `useResultScreen`: setup 時に `store.patternId !== config.id` なら `replace(scanPath)`(直接アクセスガード)。`rescan` は single のとき items 破棄して `back()`、continuous は保持して `back()`。`confirm` は snackbar 表示 → `reset()` → `push('/sample/scan')`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/screenLogic.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

import { useScanScreen } from '../logic/useScanScreen'
import { useResultScreen } from '../logic/useResultScreen'
import { getPattern } from '../logic/patterns'
import { useScanSessionStore } from '../stores/scanSessionStore'

describe('useScanScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('single: handleScan で結果を保存し結果画面へ遷移する', () => {
    const { handleScan } = useScanScreen(getPattern('single-raw'))
    handleScan({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(1)
    expect(store.single?.raw).toBe('4901234567890')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('continuous: handleScan は蓄積のみで遷移せず、parser で fields が入る', () => {
    const { handleScan } = useScanScreen(getPattern('list-split'))
    handleScan({ text: 'ITEM01,LOT-A,12', format: 'QR_CODE', timestamp: 1 })
    handleScan({ text: 'ITEM02,LOT-B,5', format: 'QR_CODE', timestamp: 2 })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(2)
    expect(store.items[0].fields).toEqual({ productCode: 'ITEM01', lot: 'LOT-A', qty: '12' })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('同一パターンのセッションが残っていれば継続する(items 保持)', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    useScanScreen(getPattern('list-raw'))
    expect(store.items).toHaveLength(1)
  })

  it('別パターンのセッションが残っていれば新規開始する', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    useScanScreen(getPattern('single-raw'))
    expect(store.patternId).toBe('single-raw')
    expect(store.items).toHaveLength(0)
  })

  it('finish で結果画面へ、cancel でセッション破棄して戻る', () => {
    const { finish, cancel } = useScanScreen(getPattern('list-raw'))
    finish()
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/list-raw/result')
    cancel()
    const store = useScanSessionStore()
    expect(store.hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('useResultScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('セッションなしの直接アクセスはスキャン画面へ replace する', () => {
    useResultScreen(getPattern('single-raw'))
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/single-raw')
  })

  it('rescan: single は items を破棄して back する', () => {
    const store = useScanSessionStore()
    store.startSession('single-raw', 'single')
    store.setSingleResult({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    const { rescan } = useResultScreen(getPattern('single-raw'))
    rescan()
    expect(store.items).toHaveLength(0)
    expect(store.hasSession).toBe(true)
    expect(mockBack).toHaveBeenCalled()
  })

  it('rescan: continuous は items を保持して back する', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    const { rescan } = useResultScreen(getPattern('list-raw'))
    rescan()
    expect(store.items).toHaveLength(1)
    expect(mockBack).toHaveBeenCalled()
  })

  it('confirm: セッションを reset して索引へ遷移する', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    const { confirm } = useResultScreen(getPattern('list-raw'))
    confirm()
    expect(store.hasSession).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/logic/useScanScreen.ts`:

```ts
import { computed } from 'vue'
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

  function handleScan(r: ScanResult) {
    if (config.mode === 'single') {
      store.setSingleResult(toItem(r))
      router.push(config.resultPath)
    } else {
      store.addItem(toItem(r))
    }
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
    isContinuous: config.mode === 'continuous',
    title: config.title,
    fields: config.fields,
  }
}
```

`src/sample/scan/logic/useResultScreen.ts`:

```ts
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanPatternConfig } from './patterns'

/** 結果画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useResultScreen(config: ScanPatternConfig) {
  const router = useRouter()
  const store = useScanSessionStore()
  const { showSnack } = useSnackbar()

  // 直接アクセス(セッションなし・別パターン)はスキャン画面へ
  if (store.patternId !== config.id) {
    router.replace(config.scanPath)
  }

  const items = computed(() => store.items)
  const single = computed(() => store.single)

  function rescan() {
    if (config.mode === 'single') store.clearItems()
    router.back()
  }
  function confirm() {
    showSnack('success', `${store.count}件を確定しました`)
    store.reset()
    router.push('/sample/scan')
  }
  function removeItem(i: number) {
    store.removeItem(i)
  }
  function clearItems() {
    store.clearItems()
  }

  return {
    items, single, rescan, confirm, removeItem, clearItems,
    title: config.title,
    fields: config.fields,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: PASS(9件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 画面結線ロジック useScanScreen/useResultScreen を追加"
```

---

### Task 9: スキャン画面ページ ×5

**Files:**
- Create: `src/sample/scan/pages/SingleRawScanPage.vue`
- Create: `src/sample/scan/pages/SingleSplitScanPage.vue`
- Create: `src/sample/scan/pages/SingleLookupScanPage.vue`
- Create: `src/sample/scan/pages/ListRawScanPage.vue`
- Create: `src/sample/scan/pages/ListSplitScanPage.vue`
- Test: `src/sample/scan/__tests__/scanPages.test.ts`

**Interfaces:**
- Consumes: Task 4 `getPattern`、Task 5 `ScanFixedLayout`/`ScanTypeTabs`/`ScanSummaryBar`、Task 7 `ScanCameraView`、Task 8 `useScanScreen`
- Produces: 5つのスキャン画面ページ(router から遅延 import される)

単発系3ページは同一構成(pattern id と案内文のみ違う)、連続系2ページは `ScanSummaryBar` + 読取完了ボタンが加わる。**ページはレイアウトのみ**で、ロジックは `useScanScreen` に委譲。

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/scanPages.test.ts`:

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

import SingleRawScanPage from '../pages/SingleRawScanPage.vue'
import ListSplitScanPage from '../pages/ListSplitScanPage.vue'
import { useScanSessionStore } from '../stores/scanSessionStore'

const mountOpts = { global: { stubs: { teleport: true } } }

describe('SingleRawScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('スキャンすると store に保存され結果画面へ遷移する', async () => {
    mount(SingleRawScanPage, mountOpts)
    capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    const store = useScanSessionStore()
    expect(store.single?.raw).toBe('4901234567890')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('キャンセルでセッション破棄して戻る', async () => {
    const w = mount(SingleRawScanPage, mountOpts)
    const cancelBtn = w.findAll('button').find((b) => b.text().includes('キャンセル'))!
    await cancelBtn.trigger('click')
    expect(useScanSessionStore().hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('ListSplitScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('スキャンで分割済み item が蓄積され、件数が表示される', async () => {
    const w = mount(ListSplitScanPage, mountOpts)
    capturedOnScan!({ text: 'ITEM01,LOT-A,12', format: 'QR_CODE', timestamp: 1 })
    capturedOnScan!({ text: 'ITEM02,LOT-B,5', format: 'QR_CODE', timestamp: 2 })
    await w.vm.$nextTick()
    const store = useScanSessionStore()
    expect(store.count).toBe(2)
    expect(store.items[1].fields.productCode).toBe('ITEM02')
    expect(w.text()).toContain('読取済み: 2件')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('読取完了で結果画面へ遷移する', async () => {
    const w = mount(ListSplitScanPage, mountOpts)
    capturedOnScan!({ text: 'ITEM01,LOT-A,12', format: 'QR_CODE', timestamp: 1 })
    await w.vm.$nextTick()
    const finishBtn = w.findAll('button').find((b) => b.text().includes('読取完了'))!
    await finishBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/list-split/result')
  })

  it('0件のとき読取完了は disabled', () => {
    const w = mount(ListSplitScanPage, mountOpts)
    const finishBtn = w.findAll('button').find((b) => b.text().includes('読取完了'))!
    expect(finishBtn.attributes('disabled')).toBeDefined()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/scanPages.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/pages/SingleRawScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanTypeTabs v-model="scanType" />
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      読み取ると結果画面へ遷移します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
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
    <ScanTypeTabs v-model="scanType" />
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      「商品コード,ロット,数量」形式のコードを読み取ると、分割して各項目に代入します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
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
    <ScanTypeTabs v-model="scanType" />
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      商品コード(数値)を読み取ると、API で商品情報を照会して表示します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
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
    <ScanTypeTabs v-model="scanType" />
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, count, latest, fields, handleScan, finish, cancel, title } =
  useScanScreen(getPattern('list-raw'))
</script>
```

`src/sample/scan/pages/ListSplitScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanTypeTabs v-model="scanType" />
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, count, latest, fields, handleScan, finish, cancel, title } =
  useScanScreen(getPattern('list-split'))
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/scanPages.test.ts`
Expected: PASS(5件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): スキャン画面ページ5種を追加(側のみ・ロジックは useScanScreen)"
```

---

### Task 10: 結果画面ページ ×5 + 索引ページ

**Files:**
- Create: `src/sample/scan/pages/SingleRawResultPage.vue`
- Create: `src/sample/scan/pages/SingleSplitResultPage.vue`
- Create: `src/sample/scan/pages/SingleLookupResultPage.vue`
- Create: `src/sample/scan/pages/ListRawResultPage.vue`
- Create: `src/sample/scan/pages/ListSplitResultPage.vue`
- Create: `src/sample/scan/pages/ScanPatternIndexPage.vue`
- Test: `src/sample/scan/__tests__/resultPages.test.ts`

**Interfaces:**
- Consumes: Task 4 `getPattern`/`SCAN_PATTERNS`、Task 5 `ScanFixedLayout`/`ScanResultCard`、Task 6 `ScanItemList`、Task 8 `useResultScreen`、既存 `@/composables/queries/useProductDetail`(`useProductDetail(id: MaybeRef<number>)` → `{ product: ComputedRef<Product | null>, isLoading, error, refetch }`、`Product { id, name, price, inStock, description, ... }`)、既存 `@/components/layout/SubLayout.vue`
- Produces: 5つの結果画面ページ+索引ページ

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/resultPages.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

const mockProduct = ref<Record<string, unknown> | null>({
  id: 1,
  name: 'サンプル商品A',
  price: 1280,
  inStock: true,
  description: 'テスト用商品',
})
vi.mock('@/composables/queries/useProductDetail', () => ({
  useProductDetail: vi.fn(() => ({
    product: computed(() => mockProduct.value),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  })),
}))

import ListSplitResultPage from '../pages/ListSplitResultPage.vue'
import SingleLookupResultPage from '../pages/SingleLookupResultPage.vue'
import { useScanSessionStore } from '../stores/scanSessionStore'

const mountOpts = { global: { stubs: { teleport: true } } }

describe('ListSplitResultPage', () => {
  beforeEach(() => vi.clearAllMocks())

  function seedStore() {
    const store = useScanSessionStore()
    store.startSession('list-split', 'continuous')
    store.addItem({
      raw: 'ITEM01,LOT-A,12',
      format: 'QR_CODE',
      timestamp: 1000,
      fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
    })
    store.addItem({
      raw: 'ITEM02,LOT-B,5',
      format: 'QR_CODE',
      timestamp: 2000,
      fields: { productCode: 'ITEM02', lot: 'LOT-B', qty: '5' },
    })
    return store
  }

  it('蓄積 items がカードで表示される', () => {
    seedStore()
    const w = mount(ListSplitResultPage, mountOpts)
    expect(w.text()).toContain('読取済み: 2件')
    expect(w.text()).toContain('商品コード: ITEM01')
    expect(w.text()).toContain('商品コード: ITEM02')
  })

  it('確定でセッションが reset され索引へ遷移する', async () => {
    const store = seedStore()
    const w = mount(ListSplitResultPage, mountOpts)
    const confirmBtn = w.findAll('button').find((b) => b.text().includes('確定'))!
    await confirmBtn.trigger('click')
    expect(store.hasSession).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan')
  })

  it('セッションなしで直接アクセスするとスキャン画面へ replace される', () => {
    mount(ListSplitResultPage, mountOpts)
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/list-split')
  })
})

describe('SingleLookupResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProduct.value = {
      id: 1,
      name: 'サンプル商品A',
      price: 1280,
      inStock: true,
      description: 'テスト用商品',
    }
  })

  function seedStore(raw: string) {
    const store = useScanSessionStore()
    store.startSession('single-lookup', 'single')
    store.setSingleResult({ raw, format: 'EAN_13', timestamp: 1000, fields: {} })
  }

  it('照会結果の商品名と価格が表示される', () => {
    seedStore('1')
    const w = mount(SingleLookupResultPage, mountOpts)
    expect(w.text()).toContain('サンプル商品A')
    expect(w.text()).toContain('1,280')
  })

  it('該当なしのときメッセージを表示する', () => {
    mockProduct.value = null
    seedStore('999')
    const w = mount(SingleLookupResultPage, mountOpts)
    expect(w.text()).toContain('該当する商品が見つかりません')
  })

  it('数値でない読取値はエラーメッセージを表示する', () => {
    seedStore('ABC')
    const w = mount(SingleLookupResultPage, mountOpts)
    expect(w.text()).toContain('商品コードが数値ではありません')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/resultPages.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/pages/SingleRawResultPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <ScanResultCard v-if="single" :item="single" />
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanResultCard from '../components/ScanResultCard.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const { single, rescan, confirm, title } = useResultScreen(getPattern('single-raw'))
</script>
```

`src/sample/scan/pages/SingleSplitResultPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="pa-4">
      <p class="text-caption text-medium-emphasis mb-3" style="word-break: break-all">
        読取値: {{ single?.raw }}
      </p>
      <v-text-field
        v-for="f in fields"
        :key="f.key"
        v-model="values[f.key]"
        :label="f.label"
        variant="outlined"
        density="compact"
        class="mb-2"
      />
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const { single, fields, rescan, confirm, title } = useResultScreen(getPattern('single-split'))

// 分割結果をフォーム初期値として展開(ユーザーが手修正できるようローカルコピー)
const values = reactive<Record<string, string>>({ ...(single.value?.fields ?? {}) })
</script>
```

`src/sample/scan/pages/SingleLookupResultPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="pa-4">
      <p class="text-caption text-medium-emphasis mb-3" style="word-break: break-all">
        読取値: {{ single?.raw }}
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
import { computed } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'
import { useProductDetail } from '@/composables/queries/useProductDetail'

const { single, rescan, confirm, title } = useResultScreen(getPattern('single-lookup'))

const productId = computed(() => Number.parseInt(single.value?.raw ?? '', 10))
const isValidId = computed(() => Number.isFinite(productId.value))
const { product, isLoading } = useProductDetail(productId)
</script>
```

`src/sample/scan/pages/ListRawResultPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <ScanItemList
      :items="items"
      :fields="fields"
      @remove="removeItem"
      @clear="clearItems"
    />
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!items.length" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanItemList from '../components/ScanItemList.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const { items, fields, rescan, confirm, removeItem, clearItems, title } =
  useResultScreen(getPattern('list-raw'))
</script>
```

`src/sample/scan/pages/ListSplitResultPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <ScanItemList
      :items="items"
      :fields="fields"
      @remove="removeItem"
      @clear="clearItems"
    />
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!items.length" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanItemList from '../components/ScanItemList.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const { items, fields, rescan, confirm, removeItem, clearItems, title } =
  useResultScreen(getPattern('list-split'))
</script>
```

`src/sample/scan/pages/ScanPatternIndexPage.vue`:

```vue
<template>
  <SubLayout title="スキャンパターン集">
    <v-container>
      <p class="text-caption text-medium-emphasis mb-4">
        読み取りモード(単発/連続)× 値の加工(そのまま/分割)× 解決(そのまま/API照会)の
        組み合わせパターン集です。部品とロジックの組み合わせだけで画面を構成しています。
      </p>
      <v-card
        v-for="p in SCAN_PATTERNS"
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
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import SubLayout from '@/components/layout/SubLayout.vue'
import { SCAN_PATTERNS } from '../logic/patterns'
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/resultPages.test.ts`
Expected: PASS(6件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 結果画面ページ5種と索引ページを追加"
```

---

### Task 11: ルート・メニュー登録 + README + 全体検証

**Files:**
- Modify: `src/router/index.ts`(catch-all `/:pathMatch(.*)*` の**直前**に11ルート追加)
- Modify: `src/stores/menuStore.ts`(`MENU_MASTER` 末尾に1件追加)
- Create: `src/sample/scan/README.md`

**Interfaces:**
- Consumes: Task 9〜10 の全ページ
- Produces: `/sample/scan` 以下のルーティングとメニュー導線

- [ ] **Step 1: ルート追加**

`src/router/index.ts` の `{ path: '/quick-scan/:featureId', ... },` の行と `{ path: '/:pathMatch(.*)*', component: ComingSoonPage },` の行の間に挿入:

```ts
    // スキャンパターン集(sample/scan)
    { path: '/sample/scan', component: () => import('@/sample/scan/pages/ScanPatternIndexPage.vue') },
    { path: '/sample/scan/single-raw', component: () => import('@/sample/scan/pages/SingleRawScanPage.vue') },
    { path: '/sample/scan/single-raw/result', component: () => import('@/sample/scan/pages/SingleRawResultPage.vue') },
    { path: '/sample/scan/single-split', component: () => import('@/sample/scan/pages/SingleSplitScanPage.vue') },
    { path: '/sample/scan/single-split/result', component: () => import('@/sample/scan/pages/SingleSplitResultPage.vue') },
    { path: '/sample/scan/single-lookup', component: () => import('@/sample/scan/pages/SingleLookupScanPage.vue') },
    { path: '/sample/scan/single-lookup/result', component: () => import('@/sample/scan/pages/SingleLookupResultPage.vue') },
    { path: '/sample/scan/list-raw', component: () => import('@/sample/scan/pages/ListRawScanPage.vue') },
    { path: '/sample/scan/list-raw/result', component: () => import('@/sample/scan/pages/ListRawResultPage.vue') },
    { path: '/sample/scan/list-split', component: () => import('@/sample/scan/pages/ListSplitScanPage.vue') },
    { path: '/sample/scan/list-split/result', component: () => import('@/sample/scan/pages/ListSplitResultPage.vue') },
```

- [ ] **Step 2: メニュー追加**

`src/stores/menuStore.ts` の `MENU_MASTER` 配列末尾(`{ id: 'scanner', ... },` の後)に追加:

```ts
  { id: 'scan-patterns',  label: 'スキャンパターン', icon: 'mdi-qrcode-scan',    to: '/sample/scan'    },
```

注意: `menuStore` は persist されるため、既存ユーザーの表示メニューには自動では出ない(メニューカスタマイズから追加可能)。`src/stores/__tests__/` に MENU_MASTER の件数を検証するテストがある場合は期待値を +1 する(`grep -n "MENU_MASTER\|length" src/stores/__tests__/menuStore*.test.ts` で確認)。

- [ ] **Step 3: README 作成**

`src/sample/scan/README.md`:

```markdown
# スキャン画面パターン集

スキャン画面の典型パターンを部品+ロジックの組み合わせで構成したサンプルモジュール。
実案件へはこのディレクトリごとコピーして流用できる(依存: `@/composables/useBarcodeScanner`,
`@/composables/useSnackbar`, `@/components/layout/SubLayout.vue`, `@/composables/queries/useProductDetail`)。

## パターン(ルート: /sample/scan)

| id | モード | 加工 | 解決 |
|---|---|---|---|
| single-raw | 単発 | そのまま | そのまま |
| single-split | 単発 | 分割 | そのまま |
| single-lookup | 単発 | そのまま | API照会 |
| list-raw | 連続 | そのまま | そのまま |
| list-split | 連続 | 分割 | そのまま |

## 構成

- `pages/` — 側(ガワ)のみ。各パターン=スキャン画面+結果画面の2ルート
- `components/` — props/emits のみの表示部品(store 非依存)
- `logic/` — 結線ロジック(useScanScreen/useResultScreen)・エンジン抽象化(useScanEngine)・
  パターン定義(patterns.ts)・値加工(parsers.ts)
- `stores/` — scanSessionStore(画面またぎ用・シリアライズ可能なデータのみ)

## 設計ポイント

- 新パターン追加 = patterns.ts に定義追加 + ページ2枚(既存部品の組み合わせ)+ ルート2本
- OCR は captureOcr() がダミー文字列を返すスタブ。実案件では Tesseract 等に差し替え
- 開発時(npm run dev)はカメラなしでも「疑似スキャン」入力で動作確認できる

詳細設計: `docs/superpowers/specs/2026-07-28-sample-scan-patterns-design.md`
```

- [ ] **Step 4: 全体検証**

```bash
npm run test:run
npm run type-check
```

Expected: 既存含め全テスト PASS、型エラーなし。失敗があれば修正してから次へ。

- [ ] **Step 5: ブラウザでの動作確認(手動)**

`npm run dev` を起動し、`/#/sample/scan` を開いて確認:

1. 索引に5パターンのカードが並ぶ
2. single-raw: 疑似スキャン入力 → 結果画面へ遷移 → 再スキャンで戻る → 確定で索引へ+snackbar
3. single-split: `ITEM01,LOT-A,12` を疑似スキャン → 3項目に分割代入されている
4. single-lookup: `1` を疑似スキャン → 商品情報が表示される
5. list-split: 2件疑似スキャン → 件数+直近概要表示 → 読取完了 → カード2枚 → 行削除/クリア → 確定
6. 結果画面 URL 直接アクセス(`/#/sample/scan/list-raw/result`)→ スキャン画面へリダイレクト
7. ヘッダ/フッタ固定・カード部のみスクロール・横スクロールが出ないこと

- [ ] **Step 6: コミット**

```bash
git add src/router/index.ts src/stores/menuStore.ts src/sample/scan/README.md
git commit -m "feat(sample-scan): ルート・メニュー登録と README を追加"
```
