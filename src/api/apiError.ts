import { isAxiosError } from 'axios'

/** HTTP エラーを正規化した型。呼び出し側は axios の内部構造を知らなくてよい。 */
export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number, cause?: unknown) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
  }
}

/** ErrorResponse（openapi/api.yaml 定義）の message を取り出す */
function extractMessage(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return undefined
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isAxiosError(error)) {
    if (error.response) {
      const message = extractMessage(error.response.data) ?? '通信に失敗しました'
      return new ApiError(message, error.response.status, error)
    }
    return new ApiError('通信に失敗しました', undefined, error)
  }
  if (error instanceof Error) return new ApiError(error.message, undefined, error)
  return new ApiError('予期しないエラーが発生しました', undefined, error)
}
