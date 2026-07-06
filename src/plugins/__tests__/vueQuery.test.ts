// ============================================================
// テスト対象: createAppQueryClient (src/plugins/vueQuery.ts)
// 種別: ユニットテスト
// ------------------------------------------------------------
// テストケース一覧
//   [1] QueryCache の onError が ApiError の message を snackbar に流す
//   [2] ApiError 以外のエラーは汎用メッセージ
//   [3] デフォルトオプション（retry / refetchOnWindowFocus）が設定されている
//   [4] MutationCache の onError が ApiError の message を snackbar に流す
//   [5] MutationCache: ApiError 以外は汎用メッセージ
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import type { Mutation, MutationFunctionContext, Query } from '@tanstack/vue-query'
import { createAppQueryClient } from '../vueQuery'
import { ApiError } from '@/api/apiError'
import { useSnackbar } from '@/composables/useSnackbar'

describe('createAppQueryClient', () => {
  const { state } = useSnackbar()

  beforeEach(() => {
    state.show = false
    state.text = ''
  })

  it('onError が ApiError の message を snackbar に流す', () => {
    const client = createAppQueryClient()
    const onError = client.getQueryCache().config.onError
    onError?.(new ApiError('商品が見つかりません', 404), {} as Query<unknown, unknown>)
    expect(state.show).toBe(true)
    expect(state.color).toBe('error')
    expect(state.text).toBe('商品が見つかりません')
  })

  it('ApiError 以外は汎用メッセージ', () => {
    const client = createAppQueryClient()
    client.getQueryCache().config.onError?.(new Error('raw'), {} as Query<unknown, unknown>)
    expect(state.text).toBe('データの取得に失敗しました')
  })

  it('クエリのデフォルトオプションが設定されている', () => {
    const client = createAppQueryClient()
    const defaults = client.getDefaultOptions().queries
    expect(defaults?.retry).toBe(1)
    expect(defaults?.refetchOnWindowFocus).toBe(false)
  })

  it('MutationCache の onError が ApiError の message を snackbar に流す', () => {
    const client = createAppQueryClient()
    const onError = client.getMutationCache().config.onError
    onError?.(
      new ApiError('在庫が不足しています', 409),
      undefined,
      undefined,
      {} as Mutation<unknown, unknown, unknown>,
      {} as MutationFunctionContext,
    )
    expect(state.show).toBe(true)
    expect(state.color).toBe('error')
    expect(state.text).toBe('在庫が不足しています')
  })

  it('MutationCache: ApiError 以外は汎用メッセージ', () => {
    const client = createAppQueryClient()
    client
      .getMutationCache()
      .config.onError?.(
        new Error('raw'),
        undefined,
        undefined,
        {} as Mutation<unknown, unknown, unknown>,
        {} as MutationFunctionContext,
      )
    expect(state.text).toBe('処理に失敗しました')
  })
})
