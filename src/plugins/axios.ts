import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { toApiError } from '@/api/apiError'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// 将来の認証トークン差し込み口（現状はそのまま通す）
axiosInstance.interceptors.request.use((config) => config)

// エラーを ApiError に正規化して reject
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
)

// Orval axios クライアントが呼ぶシグネチャ:
//   customAxiosInstance<T>(config, options?) → Promise<T>
// レスポンスボディ (response.data) だけを返す
export const customAxiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return axiosInstance({ ...config, ...options }).then((res) => res.data)
}
