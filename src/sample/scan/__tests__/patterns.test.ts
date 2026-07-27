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
