import type { ZodType } from 'zod'

/**
 * zod スキーマでレスポンスを実行時検証する共通ヘルパー。
 * 信頼境界（json/yaml データ読み取り・永続化復元）で使用する。
 * スキーマ違反 = openapi/api.yaml とデータの乖離（開発時バグ）。
 */
export const validated = async <T>(
  schema: ZodType<T>,
  promise: Promise<unknown>,
): Promise<T> => schema.parse(await promise)
