import type { Ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { usePostProduct, getGetProductsQueryKey } from '@/api'
import type { Product, ProductInput } from '@/types/api'
import type { ApiError } from '@/api/apiError'
import { useSnackbar } from '@/composables/useSnackbar'

/**
 * 商品登録。
 * 成功時: 商品系キャッシュ（一覧・詳細）を無効化し、成功 snackbar を表示。
 * 失敗時: グローバル MutationCache がエラー snackbar を表示（ページ側の処理は不要）。
 */
export function useRegisterProduct() {
  const queryClient = useQueryClient()
  const { showSnack } = useSnackbar()

  const mutation = usePostProduct({
    mutation: {
      onSuccess: async () => {
        // ['products'] 前方一致で一覧・詳細キャッシュをまとめて無効化
        await queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() })
        showSnack('success', '登録しました')
      },
    },
  })

  function submit(
    payload: ProductInput,
    callbacks?: { onSuccess?: (created: Product) => void },
  ) {
    mutation.mutate(
      { data: payload },
      { onSuccess: (created) => callbacks?.onSuccess?.(created) },
    )
  }

  return {
    submit,
    isSubmitting: mutation.isPending,
    // axios 層で全エラーが ApiError に正規化されるため、この型が実行時に正確
    error: mutation.error as Ref<ApiError | null>,
  }
}
