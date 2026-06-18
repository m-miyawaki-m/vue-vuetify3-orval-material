import type { Product, ProductListResponse } from '@/api/products'

/** SearchPage.search() のクエリ生成ロジック */
export function buildSearchQuery(
  keyword: string,
  category: string,
  inStock: boolean,
): Record<string, string> {
  const query: Record<string, string> = {}
  if (keyword.trim()) query.q = keyword
  if (category) query.category = category
  if (inStock) query.inStock = 'true'
  return query
}

/** ProductListPage.mockFallback のフィルタ + ページネーションロジック */
export function filterProducts(
  products: Product[],
  options: { q?: string; category?: string; inStock?: boolean },
  page: number,
  pageSize: number,
): ProductListResponse {
  let filtered = [...products]
  const { q, category, inStock } = options
  if (q) filtered = filtered.filter(p => p.name.includes(q) || p.description.includes(q))
  if (category) filtered = filtered.filter(p => p.category === category)
  if (inStock) filtered = filtered.filter(p => p.inStock)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize, totalPages }
}
