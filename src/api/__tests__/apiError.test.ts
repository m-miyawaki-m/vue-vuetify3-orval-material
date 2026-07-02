// ============================================================
// テスト対象: ApiError / toApiError (src/api/apiError.ts)
// 種別: ユニットテスト
// ------------------------------------------------------------
// テストケース一覧
//   [1] レスポンスありの AxiosError → status と ErrorResponse.message を反映
//   [2] レスポンスなし（ネットワークエラー）→ status undefined・汎用メッセージ
//   [3] axios 以外のエラー → メッセージを引き継いだ ApiError に包む
//   [4] toApiError の結果は ApiError インスタンス
// ============================================================
import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { ApiError, toApiError } from '../apiError'

function makeAxiosError(status?: number, data?: unknown): AxiosError {
  const error = new AxiosError('Request failed')
  if (status !== undefined) {
    error.response = {
      status,
      data,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
  }
  return error
}

describe('toApiError', () => {
  it('レスポンスありの AxiosError から status と message を取り出す', () => {
    const result = toApiError(makeAxiosError(404, { message: '商品が見つかりません' }))
    expect(result).toBeInstanceOf(ApiError)
    expect(result.status).toBe(404)
    expect(result.message).toBe('商品が見つかりません')
  })

  it('ネットワークエラーは status undefined・汎用メッセージ', () => {
    const result = toApiError(makeAxiosError())
    expect(result.status).toBeUndefined()
    expect(result.message).toBe('通信に失敗しました')
  })

  it('axios 以外のエラーもメッセージを引き継いで包む', () => {
    const result = toApiError(new Error('boom'))
    expect(result).toBeInstanceOf(ApiError)
    expect(result.message).toBe('boom')
  })

  it('文字列など Error 以外は汎用メッセージ', () => {
    const result = toApiError('oops')
    expect(result.message).toBe('予期しないエラーが発生しました')
  })
})
