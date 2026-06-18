import axios from 'axios'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// Orval 生成型 { data, status, headers } に合わせて axios レスポンス全体を返す
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customAxiosInstance = <T>(url: string, config?: any): Promise<T> => {
  return axiosInstance({ url, ...config }) as unknown as Promise<T>
}
