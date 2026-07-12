import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDraftSet,
  addItem,
  deleteSet,
  clearDrafts,
  confirmCompletedDrafts,
  findDraftSets,
  countDrafts,
  findLatestDraft,
  __resetForTest,
} from '@/db/scanRecordRepository'

describe('scanRecordRepository (メモリ実装)', () => {
  beforeEach(() => {
    __resetForTest()
  })

  it('createDraftSet: draft ステータスのセットを新規作成する', async () => {
    const set = await createDraftSet('inbound')
    expect(set.id).toBeTruthy()
    expect(set.featureId).toBe('inbound')
    expect(set.status).toBe('draft')
    expect(set.confirmedAt).toBeNull()
    expect(new Date(set.createdAt).getTime()).not.toBeNaN()
  })

  it('addItem: セットにアイテムを追加し findDraftSets で参照できる', async () => {
    const set = await createDraftSet('inbound')
    const item = await addItem(set.id, {
      seq: 1,
      itemKey: 'part_no',
      value: '4901234567894',
      format: 'EAN_13',
    })
    expect(item.setId).toBe(set.id)
    expect(item.seq).toBe(1)
    expect(new Date(item.scannedAt).getTime()).not.toBeNaN()

    const sets = await findDraftSets('inbound')
    expect(sets).toHaveLength(1)
    expect(sets[0].items).toHaveLength(1)
    expect(sets[0].items[0].value).toBe('4901234567894')
  })

  it('addItem: 存在しない setId はエラー', async () => {
    await expect(
      addItem('missing', { seq: 1, itemKey: 'k', value: 'v', format: 'MOCK' })
    ).rejects.toThrow('セットが見つかりません')
  })

  it('deleteSet: 指定セットのみ削除する', async () => {
    const a = await createDraftSet('inbound')
    const b = await createDraftSet('inbound')
    await deleteSet(a.id)
    const sets = await findDraftSets('inbound')
    expect(sets.map((s) => s.id)).toEqual([b.id])
  })

  it('clearDrafts: 対象 featureId の draft のみ全削除する', async () => {
    await createDraftSet('inbound')
    await createDraftSet('inbound')
    await createDraftSet('outbound')
    await clearDrafts('inbound')
    expect(await findDraftSets('inbound')).toHaveLength(0)
    expect(await findDraftSets('outbound')).toHaveLength(1)
  })

  it('confirmCompletedDrafts: requiredCount に達した draft を confirmed にして件数を返す', async () => {
    const done = await createDraftSet('inbound')
    await addItem(done.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })
    await addItem(done.id, { seq: 2, itemKey: 'b', value: '2', format: 'MOCK' })
    const incomplete = await createDraftSet('inbound')
    await addItem(incomplete.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })

    const count = await confirmCompletedDrafts('inbound', 2)
    expect(count).toBe(1)
    // confirmed になったセットは draft 一覧から消える
    const drafts = await findDraftSets('inbound')
    expect(drafts.map((s) => s.id)).toEqual([incomplete.id])
  })

  it('findDraftSets: 他 featureId や confirmed を含まず、作成順で返す', async () => {
    const first = await createDraftSet('inbound')
    const second = await createDraftSet('inbound')
    await createDraftSet('outbound')
    const sets = await findDraftSets('inbound')
    expect(sets.map((s) => s.id)).toEqual([first.id, second.id])
  })

  it('countDrafts: featureId ごとの draft 件数を返す（confirmed は数えない）', async () => {
    await createDraftSet('inbound')
    await createDraftSet('inbound')
    const done = await createDraftSet('outbound')
    await addItem(done.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })
    await confirmCompletedDrafts('outbound', 1)
    expect(await countDrafts()).toEqual({ inbound: 2 })
  })

  it('findLatestDraft: 最後に作成された draft を返し、なければ null', async () => {
    expect(await findLatestDraft()).toBeNull()
    await createDraftSet('inbound')
    const latest = await createDraftSet('outbound')
    expect((await findLatestDraft())?.id).toBe(latest.id)
  })

  it('読み取り結果を変更しても内部状態に影響しない（コピーを返す）', async () => {
    const set = await createDraftSet('inbound')
    await addItem(set.id, { seq: 1, itemKey: 'a', value: '1', format: 'MOCK' })
    const sets = await findDraftSets('inbound')
    sets[0].items.pop()
    expect((await findDraftSets('inbound'))[0].items).toHaveLength(1)
  })
})
