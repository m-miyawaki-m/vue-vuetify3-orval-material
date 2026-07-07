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
