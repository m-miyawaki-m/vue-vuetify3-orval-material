import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { mockProducts } from '../src/mocks/products'

const PORT = 3000

function handleProducts(url: URL, res: ServerResponse) {
  const q = url.searchParams.get('q') ?? ''
  const category = url.searchParams.get('category') ?? ''
  const inStock = url.searchParams.get('inStock')
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '5')))

  let filtered = [...mockProducts]
  if (q) filtered = filtered.filter(p => p.name.includes(q) || p.description.includes(q))
  if (category) filtered = filtered.filter(p => p.category === category)
  if (inStock === 'true') filtered = filtered.filter(p => p.inStock)

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)

  res.end(JSON.stringify({ items, total, page, pageSize, totalPages }))
}

function handleProductById(id: number, res: ServerResponse) {
  const product = mockProducts.find(p => p.id === id)
  if (product) {
    res.end(JSON.stringify(product))
  } else {
    res.statusCode = 404
    res.end(JSON.stringify({ message: '商品が見つかりません' }))
  }
}

createServer((req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const idMatch = url.pathname.match(/^\/api\/products\/(\d+)$/)

  if (url.pathname === '/api/products') {
    handleProducts(url, res)
  } else if (idMatch) {
    handleProductById(parseInt(idMatch[1]), res)
  } else {
    res.statusCode = 404
    res.end(JSON.stringify({ message: 'Not found' }))
  }
}).listen(PORT, () => {
  console.log(`Mock server: http://localhost:${PORT}/api/products`)
})
