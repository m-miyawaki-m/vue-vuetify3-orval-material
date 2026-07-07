/** SQLite 実装を隠蔽する実行インターフェース。テストではフェイクに差し替える */
export interface DbExecutor {
  run(statement: string, values?: unknown[]): Promise<{ changes: number }>
  query<T = Record<string, unknown>>(statement: string, values?: unknown[]): Promise<T[]>
}
