import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ platform: 'android' }))

const plugin = vi.hoisted(() => ({
  createDraftSet: vi.fn(),
  addItem: vi.fn(),
  deleteSet: vi.fn(),
  clearDrafts: vi.fn(),
  confirmCompletedDrafts: vi.fn(),
  findDraftSets: vi.fn(),
  countDrafts: vi.fn(),
  findLatestDraft: vi.fn(),
}))

vi.mock('@/plugins/scanRecord', () => ({ ScanRecord: plugin }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => state.platform },
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

const scanSet = {
  id: 'set-1',
  featureId: 'inbound',
  status: 'draft' as const,
  createdAt: '2026-07-08T10:00:00.000Z',
  confirmedAt: null,
}
const scanItem = {
  id: 'item-1',
  setId: 'set-1',
  seq: 1,
  itemKey: 'part_no',
  value: '4901234567894',
  format: 'EAN_13',
  scannedAt: '2026-07-08T10:00:01.000Z',
}

describe('scanRecordRepository (ScanRecord プラグイン呼び出し)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.platform = 'android'
  })

  it('createDraftSet: featureId を渡しプラグインの戻り値をそのまま返す', async () => {
    plugin.createDraftSet.mockResolvedValue(scanSet)
    const set = await createDraftSet('inbound')
    expect(plugin.createDraftSet).toHaveBeenCalledWith({ featureId: 'inbound' })
    expect(set).toEqual(scanSet)
  })

  it('addItem: setId と入力値を1つのオプションにまとめて渡す', async () => {
    plugin.addItem.mockResolvedValue(scanItem)
    const item = await addItem('set-1', { seq: 1, itemKey: 'part_no', value: '4901234567894', format: 'EAN_13' })
    expect(plugin.addItem).toHaveBeenCalledWith({
      setId: 'set-1',
      seq: 1,
      itemKey: 'part_no',
      value: '4901234567894',
      format: 'EAN_13',
    })
    expect(item).toEqual(scanItem)
  })

  it('deleteSet / clearDrafts: 引数をそのまま渡す', async () => {
    plugin.deleteSet.mockResolvedValue(undefined)
    plugin.clearDrafts.mockResolvedValue(undefined)
    await deleteSet('set-1')
    await clearDrafts('inbound')
    expect(plugin.deleteSet).toHaveBeenCalledWith({ setId: 'set-1' })
    expect(plugin.clearDrafts).toHaveBeenCalledWith({ featureId: 'inbound' })
  })

  it('confirmCompletedDrafts: count を剥がして数値で返す', async () => {
    plugin.confirmCompletedDrafts.mockResolvedValue({ count: 2 })
    const n = await confirmCompletedDrafts('inbound', 3)
    expect(plugin.confirmCompletedDrafts).toHaveBeenCalledWith({ featureId: 'inbound', requiredCount: 3 })
    expect(n).toBe(2)
  })

  it('findDraftSets: sets を剥がして配列で返す', async () => {
    plugin.findDraftSets.mockResolvedValue({ sets: [{ ...scanSet, items: [scanItem] }] })
    const sets = await findDraftSets('inbound')
    expect(sets).toHaveLength(1)
    expect(sets[0].items[0].itemKey).toBe('part_no')
  })

  it('countDrafts: counts を剥がしてマップで返す', async () => {
    plugin.countDrafts.mockResolvedValue({ counts: { inbound: 3, outbound: 1 } })
    expect(await countDrafts()).toEqual({ inbound: 3, outbound: 1 })
  })

  it('findLatestDraft: set を剥がして返し、null はそのまま null', async () => {
    plugin.findLatestDraft.mockResolvedValue({ set: { ...scanSet, items: [] } })
    expect((await findLatestDraft())?.id).toBe('set-1')
    plugin.findLatestDraft.mockResolvedValue({ set: null })
    expect(await findLatestDraft()).toBeNull()
  })

  it('Web プラットフォームでは明示エラーを投げ、プラグインを呼ばない', async () => {
    state.platform = 'web'
    await expect(createDraftSet('inbound')).rejects.toThrow(
      'SQLite はブラウザでは利用できません。エミュレータまたは実機で確認してください'
    )
    expect(plugin.createDraftSet).not.toHaveBeenCalled()
  })
})
