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
