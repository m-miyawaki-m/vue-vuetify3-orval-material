import { test as base, expect, type Page } from '@playwright/test'

/** モック商品データ（filterProducts の fixture と同じ 6件） */
export const MOCK_PRODUCTS = [
  { id: 1, name: '緑茶',      category: '食品',       price: 1000, inStock: true,  description: '国産緑茶',      rating: 4, reviews: [] },
  { id: 2, name: '蜂蜜',      category: '食品',       price: 2500, inStock: false, description: '純粋蜂蜜',      rating: 5, reviews: [] },
  { id: 3, name: 'イヤホン',  category: '電子機器',   price: 8000, inStock: true,  description: 'Bluetooth対応', rating: 4, reviews: [] },
  { id: 4, name: 'Tシャツ',   category: 'ファッション', price: 2800, inStock: true,  description: 'コットン100%',  rating: 3, reviews: [] },
  { id: 5, name: 'ヨガマット', category: 'スポーツ',   price: 3800, inStock: false, description: '軽量マット',    rating: 4, reviews: [] },
  { id: 6, name: '紅茶',      category: '食品',       price:  900, inStock: true,  description: 'アッサム産紅茶', rating: 3, reviews: [] },
]

/** /api/products への GET をインターセプトしてモックデータを返す */
export async function setupMockApi(page: Page) {
  // Prism mock server (VITE_API_BASE_URL=http://localhost:4010, path=/products)
  await page.route('http://localhost:4010/products**', async route => {
    const url = new URL(route.request().url())
    const q        = url.searchParams.get('q') ?? ''
    const category = url.searchParams.get('category') ?? ''
    const inStock  = url.searchParams.get('inStock') === 'true'
    const page_    = Number(url.searchParams.get('page') ?? 1)
    const pageSize = Number(url.searchParams.get('pageSize') ?? 5)

    let filtered = [...MOCK_PRODUCTS]
    if (q)        filtered = filtered.filter(p => p.name.includes(q) || p.description.includes(q))
    if (category) filtered = filtered.filter(p => p.category === category)
    if (inStock)  filtered = filtered.filter(p => p.inStock)

    const total      = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const items      = filtered.slice((page_ - 1) * pageSize, page_ * pageSize)

    // Prism mock server は { items, total, ... } を直接返す（data ラップなし）
    // Axios がレスポンスを { data: { items, ... }, status, ... } に包むので二重ラップ不要
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, total, page: page_, pageSize, totalPages }),
    })
  })
}

export { base as test, expect }
