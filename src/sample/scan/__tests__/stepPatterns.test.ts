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
