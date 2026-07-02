// ============================================================
// テスト対象: validated (src/api/validated.ts)
// 種別: ユニットテスト
// ------------------------------------------------------------
// テストケース一覧
//   [1] スキーマに一致するデータ → parse 済みデータを返す
//   [2] スキーマ違反データ → ZodError を throw
//   [3] orval 生成スキーマ（GetProductByIdResponse）で正常 parse
// ============================================================
import { describe, it, expect } from 'vitest'
import { z, ZodError } from 'zod'
import { validated } from '../validated'
import { GetProductByIdResponse } from '../index.zod'

describe('validated', () => {
  const schema = z.object({ id: z.number(), name: z.string() })

  it('スキーマに一致するデータを返す', async () => {
    const result = await validated(schema, Promise.resolve({ id: 1, name: '緑茶' }))
    expect(result).toEqual({ id: 1, name: '緑茶' })
  })

  it('スキーマ違反データは ZodError を throw する', async () => {
    await expect(
      validated(schema, Promise.resolve({ id: 'oops', name: 42 })),
    ).rejects.toBeInstanceOf(ZodError)
  })

  it('orval 生成スキーマで商品データを parse できる', async () => {
    const product = {
      id: 1,
      name: '緑茶',
      category: '食品',
      price: 500,
      inStock: true,
      description: '静岡県産の緑茶',
      rating: 4.5,
      reviews: [{ id: 1, author: '山田', rating: 5, comment: '美味しい' }],
    }
    const result = await validated(GetProductByIdResponse, Promise.resolve(product))
    expect(result.name).toBe('緑茶')
  })
})
