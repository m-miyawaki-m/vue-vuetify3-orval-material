import axios from 'axios'

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// Orval生成コードから fetch RequestInit 形式で渡される config を axios に変換する
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customAxiosInstance = <T>(url: string, config?: any): Promise<T> => {
  const { body, ...rest } = config ?? {}
  return axiosInstance({ url, data: body ?? undefined, ...rest }).then(({ data }) => data)
}
