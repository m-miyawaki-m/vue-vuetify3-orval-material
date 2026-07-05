import { computed, unref, type MaybeRef } from 'vue'
import { z } from 'zod'
import { useGetProductById } from '@/api'
import { GetProductByIdResponse } from '@/api/index.zod'
import type { Product } from '@/types/api'
import mockProductsData from '@/mocks/products-data.json'

// モック JSON は信頼境界のため zod で実行時検証する
const mockProducts: Product[] = z.array(GetProductByIdResponse).parse(mockProductsData)

/**
 * 商品詳細取得。id の変化で自動再フェッチ・同一 id はキャッシュから即表示。
 * API エラー時はモック JSON の同 id 商品にフォールバック（オフラインモード）。
 */
export function useProductDetail(id: MaybeRef<number>) {
  const query = useGetProductById(id)

  const product = computed<Product | null>(() =>
    query.isError.value
      ? (mockProducts.find((p) => p.id === unref(id)) ?? null)
      : (query.data.value ?? null),
  )

  return {
    product,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
