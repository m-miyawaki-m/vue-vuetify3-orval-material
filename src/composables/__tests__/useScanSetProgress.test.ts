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
