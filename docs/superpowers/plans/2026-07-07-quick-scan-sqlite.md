# クイックスキャン機能選択＋セット読み＋SQLite保持 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クイックスキャンを「機能選択（入荷/出荷/現品確認）→ 固定項目列のセット読み → SQLite 即時保存」の業務フローに拡張する。

**Architecture:** 機能定義は `scanFeatures.ts` の静的オブジェクト。画面は `scanRecordRepository`（`src/db/`）経由でのみ SQLite に触れる。カメラは既存 `useBarcodeScanner` を再利用し、セット進行ロジックは純粋 composable `useScanSetProgress` に分離する。workSessionStore（localStorage）は廃止し、作業再開ボタンは SQLite 参照に切り替える。

**Tech Stack:** Vue 3 + Vuetify 4 + Capacitor 7、`@capacitor-community/sqlite`（Web 開発時は jeep-sqlite + sql.js WASM）、vitest + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-07-07-quick-scan-sqlite-design.md`

## Global Constraints

- 既存の `ScanListPage.vue` / `ScanModePage.vue` / `scannerStore.ts` / `scanListStore.ts` / `scanModeStore.ts` / `useBarcodeScanner.ts` は**変更しない**
- UI 文言は日本語（既存画面のトーンに合わせる）
- テストは vitest（jsdom）。既存の流儀（`vi.mock('@/router')`、useBarcodeScanner のモック）は `src/pages/__tests__/ScanModePage.test.ts` を踏襲
- コミットは conventional commits（`feat:` / `test:` / `refactor:` など）
- テスト実行コマンド: `npx vitest run <path> --reporter=verbose`（watch を起動しない）
- 型チェック: `npm run type-check`

---

### Task 1: 型定義と機能定義

**Files:**
- Create: `src/types/quickScan.ts`
- Create: `src/constants/scanFeatures.ts`
- Test: `src/constants/__tests__/scanFeatures.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `ScanSet` / `ScanItem` / `ScanSetWithItems` / `ScanSetStatus`（Task 3 の repository が返す型）
  - `ScanFeature` / `ScanFeatureItem`、`scanFeatures: ScanFeature[]`、`findScanFeature(id: string): ScanFeature | undefined`

- [x] **Step 1: 失敗するテストを書く**

`src/constants/__tests__/scanFeatures.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scanFeatures, findScanFeature } from '@/constants/scanFeatures'

describe('scanFeatures', () => {
  it('入荷・出荷・現品確認の3機能が定義されている', () => {
    expect(scanFeatures.map((f) => f.id)).toEqual(['inbound', 'outbound', 'inspection'])
  })

  it('各機能の項目は1〜3個で、キーが機能内で重複しない', () => {
    for (const f of scanFeatures) {
      expect(f.items.length).toBeGreaterThanOrEqual(1)
      expect(f.items.length).toBeLessThanOrEqual(3)
      const keys = f.items.map((i) => i.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('入荷は 品番→ロット→数量 の3項目', () => {
    expect(findScanFeature('inbound')?.items.map((i) => i.label)).toEqual(['品番', 'ロット', '数量'])
  })

  it('findScanFeature は未知の id に undefined を返す', () => {
    expect(findScanFeature('unknown')).toBeUndefined()
  })
})
```

- [x] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/constants/__tests__/scanFeatures.test.ts --reporter=verbose`
Expected: FAIL（`@/constants/scanFeatures` が存在しない）

- [x] **Step 3: 型定義を書く**

`src/types/quickScan.ts`:

```ts
export type ScanSetStatus = 'draft' | 'confirmed'

/** scan_sets テーブルの1行（1セット = 1〜3個の読み取り値のまとまり） */
export interface ScanSet {
  id: string
  featureId: string
  status: ScanSetStatus
  createdAt: string // ISO 8601
  confirmedAt: string | null
}

/** scan_items テーブルの1行（セット内の1読み取り値） */
export interface ScanItem {
  id: string
  setId: string
  seq: number // 1〜3。ScanFeature.items の順序に対応
  itemKey: string
  value: string
  format: string // 'EAN_13' | 'QR_CODE' | 'MOCK' など
  scannedAt: string // ISO 8601
}

export interface ScanSetWithItems extends ScanSet {
  items: ScanItem[]
}
```

- [x] **Step 4: 機能定義を書く**

`src/constants/scanFeatures.ts`:

```ts
export interface ScanFeatureItem {
  key: string
  label: string
}

export interface ScanFeature {
  id: string
  title: string
  icon: string
  color: string
  /** 読み取り順に並んだ項目定義（1〜3個） */
  items: ScanFeatureItem[]
}

export const scanFeatures: ScanFeature[] = [
  {
    id: 'inbound',
    title: '入荷',
    icon: 'mdi-package-down',
    color: 'primary',
    items: [
      { key: 'part_no', label: '品番' },
      { key: 'lot', label: 'ロット' },
      { key: 'qty', label: '数量' },
    ],
  },
  {
    id: 'outbound',
    title: '出荷',
    icon: 'mdi-package-up',
    color: 'success',
    items: [
      { key: 'part_no', label: '品番' },
      { key: 'lot', label: 'ロット' },
    ],
  },
  {
    id: 'inspection',
    title: '現品確認',
    icon: 'mdi-magnify-scan',
    color: 'warning',
    items: [{ key: 'part_no', label: '品番' }],
  },
]

export function findScanFeature(id: string): ScanFeature | undefined {
  return scanFeatures.find((f) => f.id === id)
}
```

- [x] **Step 5: テストが通ることを確認**

Run: `npx vitest run src/constants/__tests__/scanFeatures.test.ts --reporter=verbose`
Expected: PASS（4件）

- [x] **Step 6: コミット**

```bash
git add src/types/quickScan.ts src/constants/scanFeatures.ts src/constants/__tests__/scanFeatures.test.ts
git commit -m "feat: クイックスキャンの型定義と機能定義（入荷・出荷・現品確認）を追加"
```

---

### Task 2: SQLite 基盤（プラグイン導入＋sqliteClient）

**Files:**
- Modify: `package.json`（依存追加は npm コマンドで）
- Create: `public/assets/sql-wasm.wasm`（コピー）
- Create: `src/db/types.ts`
- Create: `src/db/sqliteClient.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `DbExecutor`: `{ run(statement: string, values?: unknown[]): Promise<{ changes: number }>, query<T>(statement: string, values?: unknown[]): Promise<T[]> }`
  - `getDb(): Promise<DbExecutor>`（遅延初期化シングルトン。Task 3 の repository が使用）

ネイティブプラグインの薄いラッパーのため TDD 対象外。型チェックと Task 8 の実機（ブラウザ）確認で検証する。

※ 設計書のファイル一覧では `main.ts` に Web 時の jeep-sqlite 初期化を書くとしていたが、設計書本文の「初回 DB アクセス時に遅延初期化」を優先し、初期化はすべて `sqliteClient.ts` 内で行う。`main.ts` は変更しない。

- [x] **Step 1: 依存を導入**

```powershell
npm install @capacitor-community/sqlite jeep-sqlite
```

Expected: package.json の dependencies に両方が追加される

- [x] **Step 2: sql.js の WASM を public/assets に配置**

```powershell
New-Item -ItemType Directory -Force public/assets
Copy-Item node_modules/sql.js/dist/sql-wasm.wasm public/assets/sql-wasm.wasm
```

`node_modules/sql.js` が無い場合は `node_modules/jeep-sqlite/dist/jeep-sqlite/assets/sql-wasm.wasm` からコピーする（jeep-sqlite の同梱版）。

Expected: jeep-sqlite の同梱グルーコードと同一ビルドの sql-wasm.wasm（sql.js@1.11.0, 約652KB）を配置すること。sql.js 最新版の wasm は ABI 不一致で初期化がハングする（実測）。

- [x] **Step 3: DbExecutor インターフェースを書く**

`src/db/types.ts`:

```ts
/** SQLite 実装を隠蔽する実行インターフェース。テストではフェイクに差し替える */
export interface DbExecutor {
  run(statement: string, values?: unknown[]): Promise<{ changes: number }>
  query<T = Record<string, unknown>>(statement: string, values?: unknown[]): Promise<T[]>
}
```

- [x] **Step 4: sqliteClient を書く**

`src/db/sqliteClient.ts`:

```ts
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import type { DbExecutor } from './types'

const DB_NAME = 'quick_scan'
const DB_VERSION = 1

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS scan_sets (
    id           TEXT PRIMARY KEY,
    feature_id   TEXT NOT NULL,
    status       TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    confirmed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS scan_items (
    id         TEXT PRIMARY KEY,
    set_id     TEXT NOT NULL,
    seq        INTEGER NOT NULL,
    item_key   TEXT NOT NULL,
    value      TEXT NOT NULL,
    format     TEXT NOT NULL,
    scanned_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_scan_sets_feature_status ON scan_sets(feature_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_scan_items_set ON scan_items(set_id)`,
]

let dbPromise: Promise<DbExecutor> | null = null

// Web(開発ブラウザ)では jeep-sqlite カスタム要素 + IndexedDB 永続化が必要
async function setupWebStore(sqlite: SQLiteConnection): Promise<void> {
  const { defineCustomElements } = await import('jeep-sqlite/loader')
  defineCustomElements(window)
  if (!document.querySelector('jeep-sqlite')) {
    document.body.appendChild(document.createElement('jeep-sqlite'))
  }
  await customElements.whenDefined('jeep-sqlite')
  await sqlite.initWebStore()
}

async function open(): Promise<DbExecutor> {
  const isWeb = Capacitor.getPlatform() === 'web'
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  if (isWeb) await setupWebStore(sqlite)

  const db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
  await db.open()
  for (const sql of MIGRATIONS) await db.execute(sql)
  if (isWeb) await sqlite.saveToStore(DB_NAME)

  return {
    async run(statement, values = []) {
      const res = await db.run(statement, values)
      // web 実装はメモリ上の sql.js のため、書き込みごとに IndexedDB へ保存する
      if (isWeb) await sqlite.saveToStore(DB_NAME)
      return { changes: res.changes?.changes ?? 0 }
    },
    async query<T>(statement: string, values: unknown[] = []) {
      const res = await db.query(statement, values)
      return (res.values ?? []) as T[]
    },
  }
}

/** 初回アクセス時に遅延初期化する（スキャンを使わない起動を遅くしない） */
export function getDb(): Promise<DbExecutor> {
  if (!dbPromise) {
    dbPromise = open().catch((e) => {
      dbPromise = null // 失敗時は次回再試行できるようにする
      throw e
    })
  }
  return dbPromise
}
```

- [x] **Step 5: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [x] **Step 6: コミット**

```bash
git add package.json package-lock.json public/assets/sql-wasm.wasm src/db/types.ts src/db/sqliteClient.ts
git commit -m "feat: @capacitor-community/sqlite を導入し sqliteClient（遅延初期化・migration）を追加"
```

---

### Task 3: scanRecordRepository（CRUD）

**Files:**
- Create: `src/db/scanRecordRepository.ts`
- Test: `src/db/__tests__/scanRecordRepository.test.ts`

**Interfaces:**
- Consumes: `getDb(): Promise<DbExecutor>`（Task 2）、`ScanSet` / `ScanItem` / `ScanSetWithItems`（Task 1）
- Produces（Task 5〜7 の画面が使用）:

```ts
createDraftSet(featureId: string): Promise<ScanSet>
addItem(setId: string, input: { seq: number; itemKey: string; value: string; format: string }): Promise<ScanItem>
deleteSet(setId: string): Promise<void>
clearDrafts(featureId: string): Promise<void>
confirmCompletedDrafts(featureId: string, requiredCount: number): Promise<number> // 確定した件数
findDraftSets(featureId: string): Promise<ScanSetWithItems[]> // created_at 昇順、items は seq 昇順
countDrafts(): Promise<Record<string, number>> // featureId → draft セット数
findLatestDraft(): Promise<ScanSetWithItems | null> // 全機能横断で created_at 最新の draft
```

テストは `getDb` を `vi.mock` し、`run` / `query` の呼び出し引数と行マッピングを検証する。

- [x] **Step 1: 失敗するテストを書く**

`src/db/__tests__/scanRecordRepository.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const run = vi.fn()
const query = vi.fn()

vi.mock('@/db/sqliteClient', () => ({
  getDb: () => Promise.resolve({ run, query }),
}))

import {
  createDraftSet,
  addItem,
  deleteSet,
  clearDrafts,
  confirmCompletedDrafts,
  findDraftSets,
  countDrafts,
  findLatestDraft,
} from '@/db/scanRecordRepository'

const setRow = {
  id: 'set-1',
  feature_id: 'inbound',
  status: 'draft',
  created_at: '2026-07-07T10:00:00.000Z',
  confirmed_at: null,
}
const itemRow = {
  id: 'item-1',
  set_id: 'set-1',
  seq: 1,
  item_key: 'part_no',
  value: '4901234567894',
  format: 'EAN_13',
  scanned_at: '2026-07-07T10:00:01.000Z',
}

describe('scanRecordRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    run.mockResolvedValue({ changes: 0 })
    query.mockResolvedValue([])
  })

  it('createDraftSet: scan_sets に draft を INSERT し ScanSet を返す', async () => {
    const set = await createDraftSet('inbound')
    expect(run).toHaveBeenCalledTimes(1)
    const [sql, params] = run.mock.calls[0]
    expect(sql).toContain('INSERT INTO scan_sets')
    expect(params[0]).toBe(set.id)
    expect(params[1]).toBe('inbound')
    expect(set.status).toBe('draft')
    expect(set.featureId).toBe('inbound')
    expect(set.confirmedAt).toBeNull()
  })

  it('addItem: scan_items に INSERT し ScanItem を返す', async () => {
    const item = await addItem('set-1', { seq: 2, itemKey: 'lot', value: 'LOT-1', format: 'QR_CODE' })
    const [sql, params] = run.mock.calls[0]
    expect(sql).toContain('INSERT INTO scan_items')
    expect(params).toEqual([item.id, 'set-1', 2, 'lot', 'LOT-1', 'QR_CODE', item.scannedAt])
    expect(item.setId).toBe('set-1')
    expect(item.seq).toBe(2)
  })

  it('deleteSet: items → set の順に DELETE する', async () => {
    await deleteSet('set-1')
    expect(run.mock.calls[0][0]).toContain('DELETE FROM scan_items')
    expect(run.mock.calls[0][1]).toEqual(['set-1'])
    expect(run.mock.calls[1][0]).toContain('DELETE FROM scan_sets')
    expect(run.mock.calls[1][1]).toEqual(['set-1'])
  })

  it('clearDrafts: 対象機能の draft の items と sets を DELETE する', async () => {
    await clearDrafts('inbound')
    expect(run.mock.calls[0][0]).toContain('DELETE FROM scan_items')
    expect(run.mock.calls[0][0]).toContain("status = 'draft'")
    expect(run.mock.calls[1][0]).toContain('DELETE FROM scan_sets')
    expect(run.mock.calls[1][1]).toEqual(['inbound'])
  })

  it('confirmCompletedDrafts: 完成セットのみ confirmed に更新し件数を返す', async () => {
    run.mockResolvedValue({ changes: 2 })
    const n = await confirmCompletedDrafts('inbound', 3)
    const [sql, params] = run.mock.calls[0]
    expect(sql).toContain("SET status = 'confirmed'")
    expect(sql).toContain('HAVING COUNT(*) >= ?')
    expect(params[1]).toBe('inbound')
    expect(params[2]).toBe(3)
    expect(n).toBe(2)
  })

  it('findDraftSets: セットと items を ScanSetWithItems に組み立てる', async () => {
    query
      .mockResolvedValueOnce([setRow])   // sets
      .mockResolvedValueOnce([itemRow])  // items
    const sets = await findDraftSets('inbound')
    expect(sets).toHaveLength(1)
    expect(sets[0].id).toBe('set-1')
    expect(sets[0].featureId).toBe('inbound')
    expect(sets[0].items).toHaveLength(1)
    expect(sets[0].items[0].itemKey).toBe('part_no')
    expect(sets[0].items[0].scannedAt).toBe('2026-07-07T10:00:01.000Z')
  })

  it('countDrafts: featureId → 件数 のマップを返す', async () => {
    query.mockResolvedValueOnce([
      { feature_id: 'inbound', cnt: 3 },
      { feature_id: 'outbound', cnt: 1 },
    ])
    const counts = await countDrafts()
    expect(counts).toEqual({ inbound: 3, outbound: 1 })
  })

  it('findLatestDraft: draft がなければ null', async () => {
    query.mockResolvedValueOnce([])
    expect(await findLatestDraft()).toBeNull()
  })

  it('findLatestDraft: 最新 draft を items 付きで返す', async () => {
    query
      .mockResolvedValueOnce([setRow])   // 最新セット
      .mockResolvedValueOnce([itemRow])  // items
    const latest = await findLatestDraft()
    expect(latest?.id).toBe('set-1')
    expect(latest?.items).toHaveLength(1)
  })
})
```

- [x] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/db/__tests__/scanRecordRepository.test.ts --reporter=verbose`
Expected: FAIL（`@/db/scanRecordRepository` が存在しない）

- [x] **Step 3: repository を実装**

`src/db/scanRecordRepository.ts`:

```ts
import { getDb } from '@/db/sqliteClient'
import type { ScanSet, ScanItem, ScanSetWithItems, ScanSetStatus } from '@/types/quickScan'

interface SetRow {
  id: string
  feature_id: string
  status: string
  created_at: string
  confirmed_at: string | null
}

interface ItemRow {
  id: string
  set_id: string
  seq: number
  item_key: string
  value: string
  format: string
  scanned_at: string
}

function mapSet(row: SetRow): ScanSet {
  return {
    id: row.id,
    featureId: row.feature_id,
    status: row.status as ScanSetStatus,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
  }
}

function mapItem(row: ItemRow): ScanItem {
  return {
    id: row.id,
    setId: row.set_id,
    seq: row.seq,
    itemKey: row.item_key,
    value: row.value,
    format: row.format,
    scannedAt: row.scanned_at,
  }
}

export async function createDraftSet(featureId: string): Promise<ScanSet> {
  const db = await getDb()
  const set: ScanSet = {
    id: crypto.randomUUID(),
    featureId,
    status: 'draft',
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  }
  await db.run(
    `INSERT INTO scan_sets (id, feature_id, status, created_at, confirmed_at) VALUES (?, ?, 'draft', ?, NULL)`,
    [set.id, set.featureId, set.createdAt]
  )
  return set
}

export async function addItem(
  setId: string,
  input: { seq: number; itemKey: string; value: string; format: string }
): Promise<ScanItem> {
  const db = await getDb()
  const item: ScanItem = {
    id: crypto.randomUUID(),
    setId,
    seq: input.seq,
    itemKey: input.itemKey,
    value: input.value,
    format: input.format,
    scannedAt: new Date().toISOString(),
  }
  await db.run(
    `INSERT INTO scan_items (id, set_id, seq, item_key, value, format, scanned_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.setId, item.seq, item.itemKey, item.value, item.format, item.scannedAt]
  )
  return item
}

export async function deleteSet(setId: string): Promise<void> {
  const db = await getDb()
  await db.run(`DELETE FROM scan_items WHERE set_id = ?`, [setId])
  await db.run(`DELETE FROM scan_sets WHERE id = ?`, [setId])
}

export async function clearDrafts(featureId: string): Promise<void> {
  const db = await getDb()
  await db.run(
    `DELETE FROM scan_items WHERE set_id IN (SELECT id FROM scan_sets WHERE feature_id = ? AND status = 'draft')`,
    [featureId]
  )
  await db.run(`DELETE FROM scan_sets WHERE feature_id = ? AND status = 'draft'`, [featureId])
}

export async function confirmCompletedDrafts(featureId: string, requiredCount: number): Promise<number> {
  const db = await getDb()
  const { changes } = await db.run(
    `UPDATE scan_sets SET status = 'confirmed', confirmed_at = ?
     WHERE feature_id = ? AND status = 'draft'
       AND id IN (SELECT set_id FROM scan_items GROUP BY set_id HAVING COUNT(*) >= ?)`,
    [new Date().toISOString(), featureId, requiredCount]
  )
  return changes
}

async function attachItems(sets: ScanSet[]): Promise<ScanSetWithItems[]> {
  if (sets.length === 0) return []
  const db = await getDb()
  const placeholders = sets.map(() => '?').join(', ')
  const rows = await db.query<ItemRow>(
    `SELECT * FROM scan_items WHERE set_id IN (${placeholders}) ORDER BY seq`,
    sets.map((s) => s.id)
  )
  const bySet = new Map<string, ScanItem[]>()
  for (const row of rows) {
    const item = mapItem(row)
    const list = bySet.get(item.setId) ?? []
    list.push(item)
    bySet.set(item.setId, list)
  }
  return sets.map((s) => ({ ...s, items: bySet.get(s.id) ?? [] }))
}

export async function findDraftSets(featureId: string): Promise<ScanSetWithItems[]> {
  const db = await getDb()
  const rows = await db.query<SetRow>(
    `SELECT * FROM scan_sets WHERE feature_id = ? AND status = 'draft' ORDER BY created_at`,
    [featureId]
  )
  return attachItems(rows.map(mapSet))
}

export async function countDrafts(): Promise<Record<string, number>> {
  const db = await getDb()
  const rows = await db.query<{ feature_id: string; cnt: number }>(
    `SELECT feature_id, COUNT(*) AS cnt FROM scan_sets WHERE status = 'draft' GROUP BY feature_id`
  )
  return Object.fromEntries(rows.map((r) => [r.feature_id, r.cnt]))
}

export async function findLatestDraft(): Promise<ScanSetWithItems | null> {
  const db = await getDb()
  const rows = await db.query<SetRow>(
    `SELECT * FROM scan_sets WHERE status = 'draft' ORDER BY created_at DESC LIMIT 1`
  )
  if (rows.length === 0) return null
  const [set] = await attachItems([mapSet(rows[0])])
  return set
}
```

- [x] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/db/__tests__/scanRecordRepository.test.ts --reporter=verbose`
Expected: PASS（9件）

- [x] **Step 5: コミット**

```bash
git add src/db/scanRecordRepository.ts src/db/__tests__/scanRecordRepository.test.ts
git commit -m "feat: scan_sets/scan_items の CRUD を行う scanRecordRepository を追加"
```

---

### Task 4: useScanSetProgress（セット進行ロジック）

**Files:**
- Create: `src/composables/useScanSetProgress.ts`
- Test: `src/composables/__tests__/useScanSetProgress.test.ts`

**Interfaces:**
- Consumes: `ScanFeature`（Task 1）、`ScanItem`（Task 1）
- Produces（Task 6 の QuickScanWorkPage が使用）:

```ts
useScanSetProgress(feature: ScanFeature): {
  entries: Ref<ProgressEntry[]>          // 現在のセットで読み取り済みの項目
  nextItem: ComputedRef<ScanFeatureItem | null> // 次に読む項目。完成時は null
  isComplete: ComputedRef<boolean>
  add(value: string, format: string): { seq: number; itemKey: string } | null // 完成後は null
  reset(): void
  restore(items: ScanItem[]): void       // DB の途中セットから復元
}
// ProgressEntry = { itemKey: string; label: string; value: string; format: string }
```

- [x] **Step 1: 失敗するテストを書く**

`src/composables/__tests__/useScanSetProgress.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { useScanSetProgress } from '@/composables/useScanSetProgress'
import { findScanFeature } from '@/constants/scanFeatures'
import type { ScanItem } from '@/types/quickScan'

const inbound = findScanFeature('inbound')! // 品番→ロット→数量

function makeItem(seq: number, itemKey: string, value: string): ScanItem {
  return { id: `i${seq}`, setId: 's1', seq, itemKey, value, format: 'MOCK', scannedAt: '' }
}

describe('useScanSetProgress', () => {
  it('初期状態: 次項目は1項目目、未完成', () => {
    const p = useScanSetProgress(inbound)
    expect(p.entries.value).toEqual([])
    expect(p.nextItem.value?.key).toBe('part_no')
    expect(p.isComplete.value).toBe(false)
  })

  it('add するたびに次項目が進み、seq と itemKey を返す', () => {
    const p = useScanSetProgress(inbound)
    expect(p.add('4901234567894', 'EAN_13')).toEqual({ seq: 1, itemKey: 'part_no' })
    expect(p.nextItem.value?.key).toBe('lot')
    expect(p.add('LOT-1', 'QR_CODE')).toEqual({ seq: 2, itemKey: 'lot' })
    expect(p.add('10', 'QR_CODE')).toEqual({ seq: 3, itemKey: 'qty' })
    expect(p.isComplete.value).toBe(true)
    expect(p.nextItem.value).toBeNull()
  })

  it('完成後の add は null を返し何も追加しない', () => {
    const p = useScanSetProgress(inbound)
    p.add('a', 'MOCK')
    p.add('b', 'MOCK')
    p.add('c', 'MOCK')
    expect(p.add('d', 'MOCK')).toBeNull()
    expect(p.entries.value).toHaveLength(3)
  })

  it('reset で空に戻る', () => {
    const p = useScanSetProgress(inbound)
    p.add('a', 'MOCK')
    p.reset()
    expect(p.entries.value).toEqual([])
    expect(p.nextItem.value?.key).toBe('part_no')
  })

  it('restore: seq 順に並べ直して復元し、次項目が続きになる', () => {
    const p = useScanSetProgress(inbound)
    p.restore([makeItem(2, 'lot', 'LOT-1'), makeItem(1, 'part_no', '4901234567894')])
    expect(p.entries.value.map((e) => e.value)).toEqual(['4901234567894', 'LOT-1'])
    expect(p.entries.value[0].label).toBe('品番')
    expect(p.nextItem.value?.key).toBe('qty')
  })
})
```

- [x] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/composables/__tests__/useScanSetProgress.test.ts --reporter=verbose`
Expected: FAIL（`@/composables/useScanSetProgress` が存在しない）

- [x] **Step 3: 実装**

`src/composables/useScanSetProgress.ts`:

```ts
import { ref, computed } from 'vue'
import type { ScanFeature } from '@/constants/scanFeatures'
import type { ScanItem } from '@/types/quickScan'

export interface ProgressEntry {
  itemKey: string
  label: string
  value: string
  format: string
}

/** 1セット分の読み取り進行状態。DB・カメラには依存しない純粋ロジック */
export function useScanSetProgress(feature: ScanFeature) {
  const entries = ref<ProgressEntry[]>([])

  const nextItem = computed(() => feature.items[entries.value.length] ?? null)
  const isComplete = computed(() => entries.value.length >= feature.items.length)

  function add(value: string, format: string): { seq: number; itemKey: string } | null {
    const item = nextItem.value
    if (!item) return null
    entries.value.push({ itemKey: item.key, label: item.label, value, format })
    return { seq: entries.value.length, itemKey: item.key }
  }

  function reset() {
    entries.value = []
  }

  function restore(items: ScanItem[]) {
    entries.value = [...items]
      .sort((a, b) => a.seq - b.seq)
      .map((i) => ({
        itemKey: i.itemKey,
        label: feature.items.find((f) => f.key === i.itemKey)?.label ?? i.itemKey,
        value: i.value,
        format: i.format,
      }))
  }

  return { entries, nextItem, isComplete, add, reset, restore }
}
```

- [x] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/composables/__tests__/useScanSetProgress.test.ts --reporter=verbose`
Expected: PASS（5件）

- [x] **Step 5: コミット**

```bash
git add src/composables/useScanSetProgress.ts src/composables/__tests__/useScanSetProgress.test.ts
git commit -m "feat: セット読み進行ロジック useScanSetProgress を追加"
```

---

### Task 5: QuickScanMenuPage（機能選択画面）＋入口切り替え

**Files:**
- Create: `src/pages/QuickScanMenuPage.vue`
- Modify: `src/router/index.ts`（ルート2件追加）
- Modify: `src/components/menu/QuickScannerButton.vue:8`（遷移先変更）
- Test: `src/pages/__tests__/QuickScanMenuPage.test.ts`

**Interfaces:**
- Consumes: `scanFeatures`（Task 1）、`countDrafts()`（Task 3）
- Produces: ルート `/quick-scan`（メニュー）、`/quick-scan/:featureId`（Task 6 の画面。ここで先にルート登録だけする）

- [x] **Step 1: 失敗するテストを書く**

`src/pages/__tests__/QuickScanMenuPage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import QuickScanMenuPage from '../QuickScanMenuPage.vue'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

const countDrafts = vi.fn()
vi.mock('@/db/scanRecordRepository', () => ({
  countDrafts: (...args: unknown[]) => countDrafts(...args),
}))

import router from '@/router'

function mountPage() {
  return mount(QuickScanMenuPage, {
    global: {
      stubs: {
        MainLayout: { template: '<div><slot name="prepend" /><slot /></div>' },
      },
    },
  })
}

describe('QuickScanMenuPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    countDrafts.mockResolvedValue({})
  })

  it('3機能のボタンが表示される', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('入荷')
    expect(wrapper.text()).toContain('出荷')
    expect(wrapper.text()).toContain('現品確認')
  })

  it('未確定件数バッジが表示される', async () => {
    countDrafts.mockResolvedValue({ inbound: 3 })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('3')
  })

  it('機能ボタンタップで /quick-scan/:featureId へ遷移する', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const inboundBtn = wrapper.findAll('.quick-scan-feature-btn')[0]
    await inboundBtn.trigger('click')
    expect(router.push).toHaveBeenCalledWith('/quick-scan/inbound')
  })
})
```

- [x] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/pages/__tests__/QuickScanMenuPage.test.ts --reporter=verbose`
Expected: FAIL（`QuickScanMenuPage.vue` が存在しない）

- [x] **Step 3: ページを実装**

`src/pages/QuickScanMenuPage.vue`:

```vue
<template>
  <MainLayout title="クイックスキャン" hide-footer>
    <template #prepend>
      <v-btn icon @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <div class="feature-list">
      <v-btn
        v-for="feature in scanFeatures"
        :key="feature.id"
        :color="feature.color"
        variant="flat"
        rounded="xl"
        class="quick-scan-feature-btn"
        @click="router.push(`/quick-scan/${feature.id}`)"
      >
        <div class="quick-scan-feature-btn__inner">
          <v-badge
            v-if="draftCounts[feature.id]"
            :content="draftCounts[feature.id]"
            color="error"
            offset-x="-4"
            offset-y="-4"
          >
            <v-icon size="48">{{ feature.icon }}</v-icon>
          </v-badge>
          <v-icon v-else size="48">{{ feature.icon }}</v-icon>
          <span class="text-subtitle-1 font-weight-bold mt-2">{{ feature.title }}</span>
        </div>
      </v-btn>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import router from '@/router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { scanFeatures } from '@/constants/scanFeatures'
import { countDrafts } from '@/db/scanRecordRepository'

const draftCounts = ref<Record<string, number>>({})

onMounted(async () => {
  try {
    draftCounts.value = await countDrafts()
  } catch {
    // バッジは補助情報のため、DB 初期化失敗時は非表示のまま進む
  }
})
</script>

<style scoped>
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}
.quick-scan-feature-btn {
  width: 100%;
  min-height: 120px;
}
.quick-scan-feature-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
```

- [x] **Step 4: ルートを追加**

`src/router/index.ts` の `/sample-loading` の行の直後に**1行だけ**追加する（`:featureId` ルートは Task 6 で追加。この時点で追加すると存在しないファイルを import して type-check が落ちる）:

```ts
    { path: '/quick-scan', component: () => import('@/pages/QuickScanMenuPage.vue') },
```

- [x] **Step 5: QuickScannerButton の遷移先を変更**

`src/components/menu/QuickScannerButton.vue` の 8 行目:

```
変更前: @click="router.push('/scanner')"
変更後: @click="router.push('/quick-scan')"
```

- [x] **Step 6: テストが通ることを確認**

Run: `npx vitest run src/pages/__tests__/QuickScanMenuPage.test.ts --reporter=verbose`
Expected: PASS（3件）

- [x] **Step 7: コミット**

```bash
git add src/pages/QuickScanMenuPage.vue src/pages/__tests__/QuickScanMenuPage.test.ts src/router/index.ts src/components/menu/QuickScannerButton.vue
git commit -m "feat: クイックスキャンの機能選択画面を追加し入口をルート /quick-scan に変更"
```

---

### Task 6: QuickScanWorkPage（セット読み画面）

**Files:**
- Create: `src/pages/QuickScanWorkPage.vue`
- Modify: `src/router/index.ts`（Task 5 で `:featureId` ルート未追加の場合のみ追加）
- Test: `src/pages/__tests__/QuickScanWorkPage.test.ts`

**Interfaces:**
- Consumes:
  - `findScanFeature(id)`（Task 1）
  - repository 全関数（Task 3）: `createDraftSet` / `addItem` / `deleteSet` / `clearDrafts` / `confirmCompletedDrafts` / `findDraftSets`
  - `useScanSetProgress(feature)`（Task 4）
  - `useBarcodeScanner(videoRef, { onScan })`（既存・変更しない）
- Produces: ルート `/quick-scan/:featureId`（props: `featureId: string`）

- [x] **Step 1: 失敗するテストを書く**

`src/pages/__tests__/QuickScanWorkPage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import QuickScanWorkPage from '../QuickScanWorkPage.vue'
import type { ScanResult } from '@/types/scanner'
import type { ScanSetWithItems } from '@/types/quickScan'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn(), replace: vi.fn() },
}))

let capturedOnScan: ((result: ScanResult) => void) | null = null
const mockStart = vi.fn()
const mockStop = vi.fn()

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((videoRef, options) => {
    capturedOnScan = options.onScan
    return { start: mockStart, stop: mockStop, error: ref(null), torchAvailable: ref(false), switchTorch: vi.fn() }
  }),
}))

const repo = {
  createDraftSet: vi.fn(),
  addItem: vi.fn(),
  deleteSet: vi.fn(),
  clearDrafts: vi.fn(),
  confirmCompletedDrafts: vi.fn(),
  findDraftSets: vi.fn(),
}
vi.mock('@/db/scanRecordRepository', () => ({
  createDraftSet: (...a: unknown[]) => repo.createDraftSet(...a),
  addItem: (...a: unknown[]) => repo.addItem(...a),
  deleteSet: (...a: unknown[]) => repo.deleteSet(...a),
  clearDrafts: (...a: unknown[]) => repo.clearDrafts(...a),
  confirmCompletedDrafts: (...a: unknown[]) => repo.confirmCompletedDrafts(...a),
  findDraftSets: (...a: unknown[]) => repo.findDraftSets(...a),
}))

function makeSet(id: string, itemValues: string[]): ScanSetWithItems {
  return {
    id,
    featureId: 'inbound',
    status: 'draft',
    createdAt: '2026-07-07T10:00:00.000Z',
    confirmedAt: null,
    items: itemValues.map((value, i) => ({
      id: `${id}-i${i + 1}`,
      setId: id,
      seq: i + 1,
      itemKey: ['part_no', 'lot', 'qty'][i],
      value,
      format: 'MOCK',
      scannedAt: '2026-07-07T10:00:01.000Z',
    })),
  }
}

async function mountPage(featureId = 'inbound') {
  const wrapper = mount(QuickScanWorkPage, {
    props: { featureId },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

describe('QuickScanWorkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
    repo.findDraftSets.mockResolvedValue([])
    repo.createDraftSet.mockResolvedValue(makeSet('set-new', []))
    repo.addItem.mockImplementation((setId, input) =>
      Promise.resolve({ id: 'i', setId, ...(input as object), scannedAt: '' })
    )
    repo.confirmCompletedDrafts.mockResolvedValue(0)
  })

  it('マウント時に findDraftSets で復元し、カメラを起動する', async () => {
    await mountPage()
    expect(repo.findDraftSets).toHaveBeenCalledWith('inbound')
    expect(mockStart).toHaveBeenCalled()
  })

  it('初期状態のガイドは1項目目（品番）を促す', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('次は「品番」を読み取ってください')
  })

  it('スキャンで createDraftSet → addItem(seq=1) が呼ばれ、ガイドが次項目に進む', async () => {
    const wrapper = await mountPage()
    capturedOnScan!({ text: '4901234567894', format: 'EAN_13', timestamp: 1 })
    await flushPromises()
    expect(repo.createDraftSet).toHaveBeenCalledWith('inbound')
    expect(repo.addItem).toHaveBeenCalledWith('set-new', {
      seq: 1, itemKey: 'part_no', value: '4901234567894', format: 'EAN_13',
    })
    expect(wrapper.text()).toContain('次は「ロット」を読み取ってください')
  })

  it('3項目読み終えるとセット完成 → findDraftSets で再読込される', async () => {
    await mountPage()
    capturedOnScan!({ text: 'a', format: 'MOCK', timestamp: 1 })
    await flushPromises()
    capturedOnScan!({ text: 'b', format: 'MOCK', timestamp: 2 })
    await flushPromises()
    repo.findDraftSets.mockResolvedValue([makeSet('set-new', ['a', 'b', 'c'])])
    capturedOnScan!({ text: 'c', format: 'MOCK', timestamp: 3 })
    await flushPromises()
    expect(repo.createDraftSet).toHaveBeenCalledTimes(1) // セットは1回だけ作成
    expect(repo.addItem).toHaveBeenCalledTimes(3)
    expect(repo.findDraftSets).toHaveBeenCalledTimes(2) // 初期化 + 完成時
  })

  it('途中セットがあれば続きから復元される', async () => {
    repo.findDraftSets.mockResolvedValue([makeSet('set-partial', ['4901234567894'])])
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('次は「ロット」を読み取ってください')
    // 次のスキャンは既存セットに seq=2 で追加され、新規セットは作られない
    capturedOnScan!({ text: 'LOT-1', format: 'QR_CODE', timestamp: 1 })
    await flushPromises()
    expect(repo.createDraftSet).not.toHaveBeenCalled()
    expect(repo.addItem).toHaveBeenCalledWith('set-partial', {
      seq: 2, itemKey: 'lot', value: 'LOT-1', format: 'QR_CODE',
    })
  })

  it('確定ボタンで confirmCompletedDrafts(featureId, 項目数) が呼ばれる', async () => {
    repo.findDraftSets.mockResolvedValue([makeSet('set-1', ['a', 'b', 'c'])])
    repo.confirmCompletedDrafts.mockResolvedValue(1)
    const wrapper = await mountPage()
    const confirmBtn = wrapper.find('[data-testid="confirm-btn"]')
    await confirmBtn.trigger('click')
    await flushPromises()
    expect(repo.confirmCompletedDrafts).toHaveBeenCalledWith('inbound', 3)
  })

  it('完成セットが0件なら確定ボタンは disabled', async () => {
    const wrapper = await mountPage()
    const confirmBtn = wrapper.find('[data-testid="confirm-btn"]')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })
})
```

- [x] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/pages/__tests__/QuickScanWorkPage.test.ts --reporter=verbose`
Expected: FAIL（`QuickScanWorkPage.vue` が存在しない）

- [x] **Step 3: ページを実装**

`src/pages/QuickScanWorkPage.vue`:

```vue
<template>
  <v-layout>
    <div class="d-flex flex-column" style="width: 100%; height: 100dvh; background: #000; overflow: hidden;">

      <!-- ツールバー -->
      <div
        class="d-flex align-center px-3"
        style="height: 52px; background: rgba(0,0,0,0.75); flex-shrink: 0;"
      >
        <v-btn icon variant="text" color="white" size="small" @click="router.back()">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="flex-1-1 text-center text-white text-body-1 font-weight-bold">
          {{ feature.title }}スキャン
        </span>
        <div style="width: 36px;" />
      </div>

      <!-- DB エラーバナー -->
      <v-alert v-if="dbError" type="error" density="compact" rounded="0" style="flex-shrink: 0;">
        {{ dbError }}
      </v-alert>

      <!-- カメラエリア -->
      <div
        class="position-relative d-flex align-center justify-center"
        style="height: 38%; flex-shrink: 0;"
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

      <!-- 現在のセット進行ガイド -->
      <div class="px-3 py-2" style="background: #1a1a1a; flex-shrink: 0;">
        <p class="text-caption text-medium-emphasis mb-1">現在のセット</p>
        <div
          v-for="(item, i) in feature.items"
          :key="item.key"
          class="d-flex align-center text-body-2"
          style="min-height: 26px;"
        >
          <template v-if="i < progress.entries.value.length">
            <v-icon color="success" size="18" class="mr-2">mdi-check-circle</v-icon>
            <span class="text-white">{{ item.label }}: {{ progress.entries.value[i].value }}</span>
          </template>
          <template v-else-if="i === progress.entries.value.length">
            <v-icon color="warning" size="18" class="mr-2">mdi-timer-sand</v-icon>
            <span class="text-warning">次は「{{ item.label }}」を読み取ってください</span>
          </template>
          <template v-else>
            <v-icon color="grey" size="18" class="mr-2">mdi-circle-outline</v-icon>
            <span class="text-medium-emphasis">{{ item.label }}</span>
          </template>
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

      <!-- 読み取り済み（完成した draft セット） -->
      <div style="flex: 1; overflow-y: auto; background: #111;">
        <p class="text-caption text-medium-emphasis pa-2 pb-1">
          読み取り済み（{{ completedSets.length }}件）
        </p>
        <v-list density="compact" bg-color="transparent">
          <v-list-item v-for="set in completedSets" :key="set.id">
            <template #title>
              <span class="text-white text-body-2">{{ setTitle(set) }}</span>
            </template>
            <template #subtitle>
              <span class="text-medium-emphasis text-caption">{{ setSubtitle(set) }}</span>
            </template>
            <template #append>
              <v-btn icon size="x-small" variant="text" color="white" @click="onDeleteSet(set.id)">
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
          :disabled="completedSets.length === 0 && progress.entries.value.length === 0"
          @click="clearDialog = true"
        >クリア</v-btn>
        <v-btn
          data-testid="confirm-btn"
          color="primary"
          variant="elevated"
          style="flex: 1;"
          :disabled="completedSets.length === 0 || !!dbError"
          @click="onConfirm"
        >
          確定（{{ completedSets.length }}件）
        </v-btn>
      </div>

      <!-- クリア確認ダイアログ -->
      <v-dialog v-model="clearDialog" max-width="320">
        <v-card>
          <v-card-title class="text-body-1">未確定データを削除しますか？</v-card-title>
          <v-card-text class="text-body-2">
            読み取り途中のセットを含む未確定 {{ completedSets.length + (progress.entries.value.length > 0 ? 1 : 0) }} 件を削除します。
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="clearDialog = false">キャンセル</v-btn>
            <v-btn color="error" variant="flat" @click="onClear">削除</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="snackbar" timeout="2500">{{ snackbarText }}</v-snackbar>

    </div>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import router from '@/router'
import { findScanFeature } from '@/constants/scanFeatures'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import { useScanSetProgress } from '@/composables/useScanSetProgress'
import {
  createDraftSet,
  addItem,
  deleteSet,
  clearDrafts,
  confirmCompletedDrafts,
  findDraftSets,
} from '@/db/scanRecordRepository'
import type { ScanSetWithItems } from '@/types/quickScan'

const props = defineProps<{ featureId: string }>()

const isDev = import.meta.env.DEV
const resolved = findScanFeature(props.featureId)
if (!resolved) router.replace('/quick-scan')
// 未知の featureId は上で /quick-scan に戻すため、以降は先頭機能で埋めても表示されない
const feature = resolved ?? findScanFeature('inbound')!

const videoRef = ref<HTMLVideoElement | null>(null)
const completedSets = ref<ScanSetWithItems[]>([])
const dbError = ref<string | null>(null)
const clearDialog = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const mockValue = ref('')
const progress = useScanSetProgress(feature)
let currentSetId: string | null = null
let writing = false

const { start, stop, error } = useBarcodeScanner(videoRef, {
  onScan(result) {
    handleValue(result.text, result.format)
  },
})

async function reload() {
  const drafts = await findDraftSets(feature.id)
  completedSets.value = drafts
    .filter((s) => s.items.length >= feature.items.length)
    .reverse() // 新しい順に表示
  const partial = drafts.find((s) => s.items.length < feature.items.length)
  currentSetId = partial?.id ?? null
  if (partial) progress.restore(partial.items)
  else progress.reset()
}

async function handleValue(value: string, format: string) {
  if (writing || dbError.value) return
  const next = progress.nextItem.value
  if (!next) return
  writing = true
  try {
    if (!currentSetId) {
      currentSetId = (await createDraftSet(feature.id)).id
    }
    await addItem(currentSetId, {
      seq: progress.entries.value.length + 1,
      itemKey: next.key,
      value,
      format,
    })
    progress.add(value, format)
    if (progress.isComplete.value) await reload()
  } catch {
    notify('保存に失敗しました')
  } finally {
    writing = false
  }
}

async function onDeleteSet(setId: string) {
  try {
    await deleteSet(setId)
    await reload()
  } catch {
    notify('削除に失敗しました')
  }
}

async function onClear() {
  clearDialog.value = false
  try {
    await clearDrafts(feature.id)
    await reload()
  } catch {
    notify('削除に失敗しました')
  }
}

async function onConfirm() {
  try {
    const n = await confirmCompletedDrafts(feature.id, feature.items.length)
    notify(`${n}件確定しました`)
    await reload()
  } catch {
    notify('確定に失敗しました')
  }
}

function onMockScan() {
  if (!mockValue.value.trim()) return
  handleValue(mockValue.value.trim(), 'MOCK')
  mockValue.value = ''
}

function setTitle(set: ScanSetWithItems): string {
  return set.items.map((i) => i.value).join(' / ')
}

function setSubtitle(set: ScanSetWithItems): string {
  const time = new Date(set.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return `${feature.items.map((i) => i.label).join('/')} · ${time}`
}

function notify(text: string) {
  snackbarText.value = text
  snackbar.value = true
}

onMounted(async () => {
  try {
    await reload()
  } catch {
    dbError.value = 'データベースの初期化に失敗しました。スキャン結果は保存されません。'
  }
  start()
})
onUnmounted(stop)
</script>

<style scoped>
.scanner-frame {
  position: absolute;
  width: 200px;
  height: 200px;
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

- [x] **Step 4: ルートを確認・追加**

`src/router/index.ts` に以下があることを確認（Task 5 で未追加なら追加）:

```ts
    { path: '/quick-scan/:featureId', component: () => import('@/pages/QuickScanWorkPage.vue'), props: true },
```

- [x] **Step 5: テストが通ることを確認**

Run: `npx vitest run src/pages/__tests__/QuickScanWorkPage.test.ts --reporter=verbose`
Expected: PASS（7件）

- [x] **Step 6: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [x] **Step 7: コミット**

```bash
git add src/pages/QuickScanWorkPage.vue src/pages/__tests__/QuickScanWorkPage.test.ts src/router/index.ts
git commit -m "feat: セット読み画面 QuickScanWorkPage を追加（ガイド表示・SQLite即時保存・復元）"
```

---

### Task 7: ResumeWorkButton の SQLite 化と workSessionStore 廃止

**Files:**
- Modify: `src/components/menu/ResumeWorkButton.vue`（全面書き換え）
- Modify: `src/pages/ScannerPage.vue`（workSessionStore 呼び出し除去）
- Delete: `src/stores/workSessionStore.ts`
- Test: `src/components/menu/__tests__/ResumeWorkButton.test.ts`

**Interfaces:**
- Consumes: `findLatestDraft()` / `countDrafts()`（Task 3）、`findScanFeature(id)`（Task 1）
- Produces: なし（末端コンポーネント）

- [x] **Step 1: 失敗するテストを書く**

`src/components/menu/__tests__/ResumeWorkButton.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ResumeWorkButton from '../ResumeWorkButton.vue'
import type { ScanSetWithItems } from '@/types/quickScan'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

const findLatestDraft = vi.fn()
const countDrafts = vi.fn()
vi.mock('@/db/scanRecordRepository', () => ({
  findLatestDraft: (...a: unknown[]) => findLatestDraft(...a),
  countDrafts: (...a: unknown[]) => countDrafts(...a),
}))

import router from '@/router'

const draftSet: ScanSetWithItems = {
  id: 'set-1',
  featureId: 'inbound',
  status: 'draft',
  createdAt: '2026-07-07T05:32:00.000Z',
  confirmedAt: null,
  items: [],
}

describe('ResumeWorkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findLatestDraft.mockResolvedValue(null)
    countDrafts.mockResolvedValue({})
  })

  it('draft なし: 「作業なし」で disabled', async () => {
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    expect(wrapper.text()).toContain('作業なし')
    expect(wrapper.find('.v-btn').attributes('disabled')).toBeDefined()
  })

  it('draft あり: 機能名と件数を表示する', async () => {
    findLatestDraft.mockResolvedValue(draftSet)
    countDrafts.mockResolvedValue({ inbound: 3 })
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    expect(wrapper.text()).toContain('入荷作業を再開')
    expect(wrapper.text()).toContain('3件')
  })

  it('タップで /quick-scan/:featureId へ遷移する', async () => {
    findLatestDraft.mockResolvedValue(draftSet)
    countDrafts.mockResolvedValue({ inbound: 3 })
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    await wrapper.find('.v-btn').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/quick-scan/inbound')
  })

  it('DB エラー時: 「作業なし」で disabled のまま', async () => {
    findLatestDraft.mockRejectedValue(new Error('db error'))
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    expect(wrapper.text()).toContain('作業なし')
    expect(wrapper.find('.v-btn').attributes('disabled')).toBeDefined()
  })
})
```

- [x] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/components/menu/__tests__/ResumeWorkButton.test.ts --reporter=verbose`
Expected: FAIL（現行実装は workSessionStore 参照のため）

- [x] **Step 3: ResumeWorkButton を書き換え**

`src/components/menu/ResumeWorkButton.vue` 全体を置き換え:

```vue
<template>
  <div class="resume-work-wrapper">
    <v-btn
      :color="latestFeature ? 'secondary' : 'surface-variant'"
      variant="flat"
      rounded="xl"
      class="resume-work-btn"
      :disabled="!latestFeature"
      @click="onResume"
    >
      <div class="resume-work-btn__inner">
        <v-icon size="48">mdi-clipboard-play</v-icon>
        <span class="text-subtitle-1 font-weight-bold mt-2">{{ label }}</span>
        <span v-if="latestFeature" class="text-caption mt-1 opacity-80">{{ subLabel }}</span>
      </div>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import router from '@/router'
import { findScanFeature, type ScanFeature } from '@/constants/scanFeatures'
import { findLatestDraft, countDrafts } from '@/db/scanRecordRepository'
import type { ScanSetWithItems } from '@/types/quickScan'

const latestDraft = ref<ScanSetWithItems | null>(null)
const draftCounts = ref<Record<string, number>>({})

const latestFeature = computed<ScanFeature | null>(() =>
  latestDraft.value ? (findScanFeature(latestDraft.value.featureId) ?? null) : null
)

const label = computed(() =>
  latestFeature.value ? `${latestFeature.value.title}作業を再開` : '作業なし'
)

const subLabel = computed(() => {
  if (!latestDraft.value || !latestFeature.value) return ''
  const count = draftCounts.value[latestFeature.value.id] ?? 0
  const time = new Date(latestDraft.value.createdAt)
    .toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return `${count}件 · ${time} 開始`
})

function onResume() {
  if (!latestFeature.value) return
  router.push(`/quick-scan/${latestFeature.value.id}`)
}

onMounted(async () => {
  try {
    latestDraft.value = await findLatestDraft()
    if (latestDraft.value) draftCounts.value = await countDrafts()
  } catch {
    // DB 初期化失敗時は「作業なし」のまま（再開はできないが他機能に影響させない）
  }
})
</script>

<style scoped>
.resume-work-wrapper {
  padding: 0 24px 28px;
}
.resume-work-btn {
  width: 100%;
  min-height: 160px;
}
.resume-work-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
```

- [x] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/components/menu/__tests__/ResumeWorkButton.test.ts --reporter=verbose`
Expected: PASS（4件）

- [x] **Step 5: ScannerPage から workSessionStore を除去**

`src/pages/ScannerPage.vue` の script 部分に対して以下の変更を行う（テンプレート・style は変更なし）:

1. import 行を削除: `import { useWorkSessionStore } from '@/stores/workSessionStore'`
2. 宣言を削除: `const workStore = useWorkSessionStore()`
3. `onScan` 内の削除:
   - continuous 分岐の `workStore.updateBarcodes(results.value.map(r => r.text))`
   - single 分岐の `workStore.clearSession()`
4. `removeResult` 内の `workStore.updateBarcodes(results.value.map(r => r.text))` を削除
5. `onComplete` 内の `workStore.clearSession()` を削除
6. `onMockScan` 内の `workStore.updateBarcodes(...)` と `workStore.clearSession()` を削除
7. `onMounted` を `onMounted(start)` に戻す（`if (!workStore.currentSession) workStore.startScannerSession()` を削除）

- [x] **Step 6: workSessionStore を削除**

```powershell
Remove-Item src/stores/workSessionStore.ts -Confirm:$false
```

- [x] **Step 7: 参照が残っていないことを確認**

Run: `npx vitest run --reporter=verbose` と `npm run type-check`
Expected: 全テスト PASS、型エラーなし（workSessionStore への参照が残っていれば type-check が落ちる）

- [x] **Step 8: コミット**

```bash
git add src/components/menu/ResumeWorkButton.vue src/components/menu/__tests__/ResumeWorkButton.test.ts src/pages/ScannerPage.vue
git rm src/stores/workSessionStore.ts
git commit -m "refactor: 作業再開ボタンを SQLite 参照に切り替え workSessionStore を廃止"
```

---

### Task 8: 全体検証

**Files:** なし（検証のみ）

- [x] **Step 1: 全テスト・型・lint**

```powershell
npm run type-check
npx vitest run --reporter=verbose
npm run lint
```

Expected: すべてエラーなし（既存 E2E の既知失敗3件は対象外）

- [x] **Step 2: ブラウザで動作確認**

```powershell
npm run dev
```

確認項目（DEV モック入力を使用）:

```
□ ホーム → クイックスキャン → 機能選択画面が開く
□ 入荷を開き、モック入力で3値入れると1セット完成しリストに載る
□ 2値だけ入れて戻る → 再入場で「次は数量」から再開される
□ 機能選択画面の入荷バッジに未確定件数が出る
□ 確定 →「N件確定しました」、リストから消え、バッジも減る
□ ホームの作業再開ボタンに「入荷作業を再開」が出る（draft がある場合）
□ ブラウザをリロードしても draft が残っている（IndexedDB 永続化）
```

- [ ] **Step 3: （任意）Android 反映**

```powershell
npx cap sync android
```

実機確認は必要になったタイミングでよい。

- [x] **Step 4: 計画のチェックボックスを更新してコミット**

```bash
git add docs/superpowers/plans/2026-07-07-quick-scan-sqlite.md
git commit -m "docs: クイックスキャン実装計画の進捗を更新"
```
