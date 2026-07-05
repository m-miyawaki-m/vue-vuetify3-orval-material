import { computed, unref, type MaybeRef, type Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { searchStockProducts } from '@/api'
import type { ApiError } from '@/api/apiError'
import type { ProductListResponse, StockSearchCondition } from '@/types/api'
// ── オフラインフォールバック（開発中の暫定運用: 使うときだけコメント解除） ──
// 実行時フラグでの分岐はせず、コメントアウトの有無で切り替える方針。
// 下の import 群・filterByCondition・searchResult フォールバック版を同時に解除すること。
// import { z } from 'zod'
// import { GetProductByIdResponse } from '@/api/index.zod'
// import type { Product } from '@/types/api'
// import mockProductsData from '@/mocks/products-data.json'

// const mockProducts: Product[] = z.array(GetProductByIdResponse).parse(mockProductsData)
//
// /** モック JSON を在庫検索条件でフィルタする（keywords・categories は OR、条件間は AND） */
// function filterByCondition(c: StockSearchCondition): ProductListResponse {
//   const keywords = c.keywords ?? []
//   const categories = c.categories ?? []
//   const items = mockProducts.filter((p) => {
//     const keywordHit =
//       keywords.length === 0 || keywords.some((k) => p.name.includes(k) || p.description.includes(k))
//     const categoryHit = categories.length === 0 || categories.includes(p.category)
//     const stockHit = !c.inStockOnly || p.inStock
//     return keywordHit && categoryHit && stockHit
//   })
//   return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 }
// }

/**
 * 在庫検索（画面固有の検索オブジェクトを POST で送るパターンのお手本）。
 *
 * - 検索条件は在庫検索画面専用の StockSearchCondition（openapi.yaml で画面ごとに自由に定義）
 * - HTTP は POST だが意味的には「取得」なので、orval 生成の素の関数を useQuery で包み、
 *   他の取得系 composable と同じ契約（データ・isLoading・error・refetch）に揃える
 * - condition が null の間は検索しない（検索ボタン押下までの待機状態）
 * - queryKey は 'products' 前置なので、商品登録時の invalidate で検索結果も再取得される
 */
export function useStockSearch(condition: MaybeRef<StockSearchCondition | null>) {
  const query = useQuery({
    queryKey: ['products', 'stock-search', condition],
    queryFn: ({ signal }) => searchStockProducts(unref(condition)!, undefined, signal),
    enabled: computed(() => unref(condition) !== null),
  })

  const searchResult = computed<ProductListResponse | null>(() => query.data.value ?? null)
  // ↓ オフラインフォールバック版。使うときは上の行を削除（またはコメントアウト）して
  //   こちらとファイル冒頭の import 群・filterByCondition を解除する
  // const searchResult = computed<ProductListResponse | null>(() => {
  //   const c = unref(condition)
  //   if (query.isError.value && c) return filterByCondition(c) // API エラー時はモック JSON を表示
  //   return query.data.value ?? null
  // })

  return {
    searchResult,
    isLoading: query.isLoading,
    // axios 層で全エラーが ApiError に正規化されるため、この型が実行時に正確
    error: query.error as Ref<ApiError | null>,
    refetch: query.refetch,
  }
}
