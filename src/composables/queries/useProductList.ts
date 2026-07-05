import { computed, unref, type MaybeRef } from 'vue'
import { z } from 'zod'
import { keepPreviousData } from '@tanstack/vue-query'
import { useGetProducts } from '@/api'
import { GetProductByIdResponse } from '@/api/index.zod'
import type { GetProductsParams, Product, ProductListResponse } from '@/types/api'
import mockProductsData from '@/mocks/products-data.json'
import { filterProducts } from '@/utils/searchUtils'

// モック JSON は信頼境界のため zod で実行時検証する
const mockProducts: Product[] = z.array(GetProductByIdResponse).parse(mockProductsData)

/**
 * 商品一覧取得。params の変化で自動再フェッチ・同一条件はキャッシュから即表示。
 * ページ遷移中は前ページのデータを保持（表示の点滅を防ぐ）。
 * API エラー時はモック JSON をクライアント側でフィルタして表示（オフラインモード）。
 */
export function useProductList(params: MaybeRef<GetProductsParams>) {
  const query = useGetProducts(params, {
    query: { placeholderData: keepPreviousData },
  })

  const isFallback = computed(() => query.isError.value)

  const mockFallback = computed<ProductListResponse>(() => {
    const p = unref(params)
    return filterProducts(
      mockProducts,
      { q: p.q, category: p.category, inStock: p.inStock },
      p.page ?? 1,
      p.pageSize ?? 5,
    )
  })

  const productList = computed<ProductListResponse>(() =>
    isFallback.value ? mockFallback.value : (query.data.value ?? mockFallback.value),
  )

  return {
    productList,
    isFallback,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
