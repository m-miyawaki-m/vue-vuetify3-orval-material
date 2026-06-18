import { describe, it, expect } from 'vitest'
import { buildSearchQuery, filterProducts } from '../searchUtils'
import type { Product } from '@/api/products'

// ============================================================
// デシジョンテーブル: buildSearchQuery
// ------------------------------------------------------------
// 条件
//   C1: keyword（空白除去後）が存在する
//   C2: category が存在する
//   C3: inStock が true
//
// 期待アクション
//   A1: query に q を含む
//   A2: query に category を含む
//   A3: query に inStock:"true" を含む
//
// | ケース | C1 | C2 | C3 | A1 | A2 | A3 |
// |--------|----|----|----|----|----|----|
// | BQ-1   |  N |  N |  N |  - |  - |  - |  空オブジェクト
// | BQ-2   |  Y |  N |  N |  Y |  - |  - |
// | BQ-3   |  N |  Y |  N |  - |  Y |  - |
// | BQ-4   |  N |  N |  Y |  - |  - |  Y |
// | BQ-5   |  Y |  Y |  N |  Y |  Y |  - |
// | BQ-6   |  Y |  N |  Y |  Y |  - |  Y |
// | BQ-7   |  N |  Y |  Y |  - |  Y |  Y |
// | BQ-8   |  Y |  Y |  Y |  Y |  Y |  Y |
// | BQ-9   | 空白のみ(N扱い) | N | N | - | - | - | 境界値
// ============================================================

describe('buildSearchQuery', () => {
  it('[BQ-1] すべて空のとき空オブジェクトを返す', () => {
    expect(buildSearchQuery('', '', false)).toEqual({})
  })

  it('[BQ-2] keyword のみ → { q }', () => {
    expect(buildSearchQuery('緑茶', '', false)).toEqual({ q: '緑茶' })
  })

  it('[BQ-3] category のみ → { category }', () => {
    expect(buildSearchQuery('', '食品', false)).toEqual({ category: '食品' })
  })

  it('[BQ-4] inStock のみ → { inStock: "true" }', () => {
    expect(buildSearchQuery('', '', true)).toEqual({ inStock: 'true' })
  })

  it('[BQ-5] keyword + category', () => {
    expect(buildSearchQuery('茶', '食品', false)).toEqual({ q: '茶', category: '食品' })
  })

  it('[BQ-6] keyword + inStock', () => {
    expect(buildSearchQuery('茶', '', true)).toEqual({ q: '茶', inStock: 'true' })
  })

  it('[BQ-7] category + inStock', () => {
    expect(buildSearchQuery('', '電子機器', true)).toEqual({ category: '電子機器', inStock: 'true' })
  })

  it('[BQ-8] 3つすべて → 全パラムを返す', () => {
    expect(buildSearchQuery('茶', '食品', true)).toEqual({
      q: '茶',
      category: '食品',
      inStock: 'true',
    })
  })

  it('[BQ-9] 空白のみの keyword は q に含めない（境界値）', () => {
    expect(buildSearchQuery('   ', '食品', false)).toEqual({ category: '食品' })
  })
})

// ============================================================
// デシジョンテーブル: filterProducts
// ------------------------------------------------------------
// 条件
//   C1: q が存在する（キーワード検索）
//   C2: category が存在する
//   C3: inStock が true
//
// 期待アクション
//   A1: name/description で絞り込まれる
//   A2: category で絞り込まれる
//   A3: inStock=true のみに絞り込まれる
//
// | ケース | C1 | C2 | C3 | A1 | A2 | A3 |
// |--------|----|----|----|----|----|----|
// | FP-1   |  N |  N |  N |  - |  - |  - |  全件
// | FP-2   |  Y |  N |  N |  Y |  - |  - |
// | FP-3   |  N |  Y |  N |  - |  Y |  - |
// | FP-4   |  N |  N |  Y |  - |  - |  Y |
// | FP-5   |  Y |  Y |  N |  Y |  Y |  - |
// | FP-6   |  Y |  N |  Y |  Y |  - |  Y |  ← 追加
// | FP-7   |  N |  Y |  Y |  - |  Y |  Y |
// | FP-8   |  Y |  Y |  Y |  Y |  Y |  Y |  ← 追加
//
// 追加境界値
//   FP-9 : q が一致しない → total=0
//   FP-10: ページネーション page=1
//   FP-11: ページネーション page=2
//   FP-12: 全件0のとき totalPages 最低1
// ============================================================

const products: Product[] = [
  { id: 1, name: '緑茶',    category: '食品',       price: 1000, inStock: true,  description: '国産緑茶',     rating: 4, reviews: [] },
  { id: 2, name: '蜂蜜',    category: '食品',       price: 2500, inStock: false, description: '純粋蜂蜜',     rating: 5, reviews: [] },
  { id: 3, name: 'イヤホン', category: '電子機器',   price: 8000, inStock: true,  description: 'Bluetooth対応', rating: 4, reviews: [] },
  { id: 4, name: 'Tシャツ', category: 'ファッション', price: 2800, inStock: true,  description: 'コットン100%', rating: 3, reviews: [] },
  { id: 5, name: 'ヨガマット', category: 'スポーツ', price: 3800, inStock: false, description: '軽量マット',   rating: 4, reviews: [] },
  { id: 6, name: '紅茶',    category: '食品',       price:  900, inStock: true,  description: 'アッサム産紅茶', rating: 3, reviews: [] },
]

describe('filterProducts', () => {
  it('[FP-1] 条件なしで全件返す', () => {
    const result = filterProducts(products, {}, 1, 10)
    expect(result.total).toBe(6)
    expect(result.items).toHaveLength(6)
  })

  it('[FP-2] q で名前部分一致フィルタ', () => {
    const result = filterProducts(products, { q: '茶' }, 1, 10)
    expect(result.total).toBe(2)
    expect(result.items.map(p => p.name)).toEqual(['緑茶', '紅茶'])
  })

  it('[FP-2b] q で説明文部分一致フィルタ', () => {
    const result = filterProducts(products, { q: 'Bluetooth' }, 1, 10)
    expect(result.total).toBe(1)
    expect(result.items[0].name).toBe('イヤホン')
  })

  it('[FP-3] category でフィルタ', () => {
    const result = filterProducts(products, { category: '食品' }, 1, 10)
    expect(result.total).toBe(3)
    expect(result.items.every(p => p.category === '食品')).toBe(true)
  })

  it('[FP-4] inStock=true で在庫ありのみ', () => {
    const result = filterProducts(products, { inStock: true }, 1, 10)
    expect(result.total).toBe(4)
    expect(result.items.every(p => p.inStock)).toBe(true)
  })

  it('[FP-5] q + category の複合フィルタ', () => {
    const result = filterProducts(products, { q: '茶', category: '食品' }, 1, 10)
    expect(result.total).toBe(2) // 緑茶・紅茶
  })

  it('[FP-6] q + inStock の複合フィルタ', () => {
    const result = filterProducts(products, { q: '茶', inStock: true }, 1, 10)
    expect(result.total).toBe(2) // 緑茶(在庫あり)・紅茶(在庫あり)
    expect(result.items.every(p => p.inStock)).toBe(true)
  })

  it('[FP-7] category + inStock の複合フィルタ', () => {
    const result = filterProducts(products, { category: '食品', inStock: true }, 1, 10)
    expect(result.total).toBe(2) // 緑茶・紅茶（蜂蜜は在庫なし）
  })

  it('[FP-8] q + category + inStock の3条件フィルタ', () => {
    const result = filterProducts(products, { q: '茶', category: '食品', inStock: true }, 1, 10)
    expect(result.total).toBe(2) // 緑茶・紅茶
    expect(result.items.every(p => p.inStock && p.category === '食品')).toBe(true)
  })

  it('[FP-9] q が一致しない → total=0・items=[]', () => {
    const result = filterProducts(products, { q: '存在しない商品' }, 1, 10)
    expect(result.total).toBe(0)
    expect(result.items).toHaveLength(0)
  })

  it('[FP-10] ページネーション: pageSize=2 で page=1 は先頭2件', () => {
    const result = filterProducts(products, {}, 1, 2)
    expect(result.items).toHaveLength(2)
    expect(result.totalPages).toBe(3)
    expect(result.items[0].id).toBe(1)
  })

  it('[FP-11] ページネーション: pageSize=2 で page=2 は3・4件目', () => {
    const result = filterProducts(products, {}, 2, 2)
    expect(result.items[0].id).toBe(3)
    expect(result.items[1].id).toBe(4)
  })

  it('[FP-12] 全件0のとき totalPages は最低1', () => {
    const result = filterProducts(products, { q: '該当なし' }, 1, 5)
    expect(result.totalPages).toBe(1)
  })
})
