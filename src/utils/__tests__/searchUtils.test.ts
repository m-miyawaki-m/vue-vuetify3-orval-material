import { describe, it, expect } from 'vitest'
import { buildSearchQuery, filterProducts } from '../searchUtils'
import type { Product } from '@/api/products'

// ── buildSearchQuery ──────────────────────────────────────────

describe('buildSearchQuery', () => {
  it('すべて空のとき空オブジェクトを返す', () => {
    expect(buildSearchQuery('', '', false)).toEqual({})
  })

  it('keyword のみ → { q }', () => {
    expect(buildSearchQuery('緑茶', '', false)).toEqual({ q: '緑茶' })
  })

  it('category のみ → { category }', () => {
    expect(buildSearchQuery('', '食品', false)).toEqual({ category: '食品' })
  })

  it('inStock のみ → { inStock: "true" }', () => {
    expect(buildSearchQuery('', '', true)).toEqual({ inStock: 'true' })
  })

  it('keyword + category', () => {
    expect(buildSearchQuery('茶', '食品', false)).toEqual({ q: '茶', category: '食品' })
  })

  it('keyword + inStock', () => {
    expect(buildSearchQuery('茶', '', true)).toEqual({ q: '茶', inStock: 'true' })
  })

  it('category + inStock', () => {
    expect(buildSearchQuery('', '電子機器', true)).toEqual({ category: '電子機器', inStock: 'true' })
  })

  it('3つすべて揃うと全パラムを返す', () => {
    expect(buildSearchQuery('茶', '食品', true)).toEqual({
      q: '茶',
      category: '食品',
      inStock: 'true',
    })
  })

  it('空白のみの keyword は q に含めない', () => {
    expect(buildSearchQuery('   ', '食品', false)).toEqual({ category: '食品' })
  })
})

// ── filterProducts ────────────────────────────────────────────

const products: Product[] = [
  { id: 1, name: '緑茶', category: '食品',   price: 1000, inStock: true,  description: '国産緑茶', rating: 4, reviews: [] },
  { id: 2, name: '蜂蜜', category: '食品',   price: 2500, inStock: false, description: '純粋蜂蜜', rating: 5, reviews: [] },
  { id: 3, name: 'イヤホン', category: '電子機器', price: 8000, inStock: true, description: 'Bluetooth対応', rating: 4, reviews: [] },
  { id: 4, name: 'Tシャツ', category: 'ファッション', price: 2800, inStock: true, description: 'コットン100%', rating: 3, reviews: [] },
  { id: 5, name: 'ヨガマット', category: 'スポーツ', price: 3800, inStock: false, description: '軽量マット', rating: 4, reviews: [] },
  { id: 6, name: '紅茶', category: '食品', price: 900, inStock: true, description: 'アッサム産紅茶', rating: 3, reviews: [] },
]

describe('filterProducts', () => {
  it('条件なしで全件返す', () => {
    const result = filterProducts(products, {}, 1, 10)
    expect(result.total).toBe(6)
    expect(result.items).toHaveLength(6)
  })

  it('q で名前部分一致フィルタ', () => {
    const result = filterProducts(products, { q: '茶' }, 1, 10)
    expect(result.total).toBe(2)
    expect(result.items.map(p => p.name)).toEqual(['緑茶', '紅茶'])
  })

  it('q で説明文部分一致フィルタ', () => {
    const result = filterProducts(products, { q: 'Bluetooth' }, 1, 10)
    expect(result.total).toBe(1)
    expect(result.items[0].name).toBe('イヤホン')
  })

  it('category でフィルタ', () => {
    const result = filterProducts(products, { category: '食品' }, 1, 10)
    expect(result.total).toBe(3)
    expect(result.items.every(p => p.category === '食品')).toBe(true)
  })

  it('inStock=true で在庫ありのみ', () => {
    const result = filterProducts(products, { inStock: true }, 1, 10)
    expect(result.total).toBe(4)
    expect(result.items.every(p => p.inStock)).toBe(true)
  })

  it('q + category の複合フィルタ', () => {
    const result = filterProducts(products, { q: '茶', category: '食品' }, 1, 10)
    expect(result.total).toBe(2)
  })

  it('category + inStock の複合フィルタ', () => {
    const result = filterProducts(products, { category: '食品', inStock: true }, 1, 10)
    expect(result.total).toBe(2) // 緑茶・紅茶（蜂蜜は在庫なし）
  })

  it('一致なしのとき total=0・items=[]', () => {
    const result = filterProducts(products, { q: '存在しない商品' }, 1, 10)
    expect(result.total).toBe(0)
    expect(result.items).toHaveLength(0)
  })

  // ページネーション
  it('pageSize=2 で page=1 は先頭2件', () => {
    const result = filterProducts(products, {}, 1, 2)
    expect(result.items).toHaveLength(2)
    expect(result.totalPages).toBe(3)
    expect(result.items[0].id).toBe(1)
  })

  it('pageSize=2 で page=2 は3・4件目', () => {
    const result = filterProducts(products, {}, 2, 2)
    expect(result.items[0].id).toBe(3)
    expect(result.items[1].id).toBe(4)
  })

  it('全件0のとき totalPages は最低1', () => {
    const result = filterProducts(products, { q: '該当なし' }, 1, 5)
    expect(result.totalPages).toBe(1)
  })
})
