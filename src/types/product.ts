export type ProductCategory = '食品' | '電子機器' | 'ファッション' | '家具' | 'スポーツ'

export interface Review {
  id: number
  author: string
  rating: number
  comment: string
}

export interface Product {
  id: number
  name: string
  category: ProductCategory
  price: number
  inStock: boolean
  description: string
  rating: number
  reviews: Review[]
}
