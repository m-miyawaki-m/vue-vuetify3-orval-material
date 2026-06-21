import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// Orval axios クライアントが呼ぶシグネチャ:
//   customAxiosInstance<T>(config, options?) → Promise<T>
// レスポンスボディ (response.data) だけを返す
export const customAxiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return axiosInstance({ ...config, ...options }).then((res) => res.data)
}
