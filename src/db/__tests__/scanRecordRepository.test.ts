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
    expect(run.mock.calls[1][0]).toContain("status = 'draft'")
    expect(run.mock.calls[1][1]).toEqual(['inbound'])
  })

  it('confirmCompletedDrafts: 完成セットのみ confirmed に更新し件数を返す', async () => {
    run.mockResolvedValue({ changes: 2 })
    const n = await confirmCompletedDrafts('inbound', 3)
    const [sql, params] = run.mock.calls[0]
    expect(sql).toContain("SET status = 'confirmed'")
    expect(sql).toContain('HAVING COUNT(*) >= ?')
    expect(sql).toContain('feature_id = ?')
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
