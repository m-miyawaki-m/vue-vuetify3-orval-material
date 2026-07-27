import { computed, unref, type MaybeRef, type Ref } from 'vue'
import { z } from 'zod'
import { useGetProductById } from '@/api'
import { GetProductByIdResponse } from '@/api/index.zod'
import type { Product } from '@/types/api'
import type { ApiError } from '@/api/apiError'
import mockProductsData from '@/mocks/products-data.json'

// モック JSON は信頼境界のため zod で実行時検証する
const mockProducts: Product[] = z.array(GetProductByIdResponse).parse(mockProductsData)

/**
 * 商品詳細取得。id の変化で自動再フェッチ・同一 id はキャッシュから即表示。
 * API エラー時はモック JSON の同 id 商品にフォールバック（オフラインモード）。
 *
 * @param id - 商品ID。null を渡すと照会は発火しない（生成コードの enabled ガードが実行時に null を無効化）
 */
export function useProductDetail(id: MaybeRef<number | null>) {
  // 型が MaybeRef<number> を要求するため、null を型レベルで無視してキャスト
  // 実行時の enabled ガードが null チェックを行うため、安全性は担保される
  const query = useGetProductById(id as MaybeRef<number>)

  const product = computed<Product | null>(() =>
    query.isError.value
      ? (mockProducts.find((p) => p.id === unref(id)) ?? null)
      : (query.data.value ?? null),
  )

  return {
    product,
    isLoading: query.isLoading,
    // axios 層で全エラーが ApiError に正規化されるため、この型が実行時に正確
    error: query.error as Ref<ApiError | null>,
    refetch: query.refetch,
  }
}
