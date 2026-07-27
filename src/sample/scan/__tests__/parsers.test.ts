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
