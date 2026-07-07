import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import type { DbExecutor } from './types'

const DB_NAME = 'quick_scan'
const DB_VERSION = 1

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS scan_sets (
    id           TEXT PRIMARY KEY,
    feature_id   TEXT NOT NULL,
    status       TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    confirmed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS scan_items (
    id         TEXT PRIMARY KEY,
    set_id     TEXT NOT NULL,
    seq        INTEGER NOT NULL,
    item_key   TEXT NOT NULL,
    value      TEXT NOT NULL,
    format     TEXT NOT NULL,
    scanned_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_scan_sets_feature_status ON scan_sets(feature_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_scan_items_set ON scan_items(set_id)`,
]

let dbPromise: Promise<DbExecutor> | null = null

const INIT_TIMEOUT_MS = 10_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('SQLite の初期化がタイムアウトしました')), ms)
    }),
  ])
}

// Web(開発ブラウザ)では jeep-sqlite カスタム要素 + IndexedDB 永続化が必要
async function setupWebStore(sqlite: SQLiteConnection): Promise<void> {
  const { defineCustomElements } = await import('jeep-sqlite/loader')
  defineCustomElements(window)
  if (!document.querySelector('jeep-sqlite')) {
    document.body.appendChild(document.createElement('jeep-sqlite'))
  }
  await customElements.whenDefined('jeep-sqlite')
  await sqlite.initWebStore()
}

async function open(): Promise<DbExecutor> {
  const isWeb = Capacitor.getPlatform() === 'web'
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  if (isWeb) await setupWebStore(sqlite)

  // 直前の open() が途中で失敗していても再試行できるよう、
  // 既存コネクションがあれば再利用し、なければ新規作成する
  // この呼び出しが失敗後リトライの要: JS 側の接続辞書が空のとき、プラグイン側に残った
  // 古い接続を破棄してくれる（下の retrieveConnection 分岐は防御的なもので通常は通らない）
  const consistency = await sqlite.checkConnectionsConsistency()
  const hasConn = (await sqlite.isConnection(DB_NAME, false)).result
  const db =
    consistency.result && hasConn
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)

  try {
    await db.open()
    for (const sql of MIGRATIONS) await db.execute(sql)
    if (isWeb) await sqlite.saveToStore(DB_NAME)
  } catch (e) {
    // 失敗時はコネクションを破棄し、次回 open() 呼び出しで再作成できるようにする
    await sqlite.closeConnection(DB_NAME, false).catch(() => {})
    throw e
  }

  return {
    async run(statement, values = []) {
      const res = await db.run(statement, values)
      // web 実装はメモリ上の sql.js のため、書き込みごとに IndexedDB へ保存する
      if (isWeb) await sqlite.saveToStore(DB_NAME)
      return { changes: res.changes?.changes ?? 0 }
    },
    async query<T>(statement: string, values: unknown[] = []) {
      const res = await db.query(statement, values)
      return (res.values ?? []) as T[]
    },
  }
}

/** 初回アクセス時に遅延初期化する（スキャンを使わない起動を遅くしない） */
export function getDb(): Promise<DbExecutor> {
  if (!dbPromise) {
    dbPromise = withTimeout(open(), INIT_TIMEOUT_MS).catch((e) => {
      dbPromise = null // 失敗時は次回再試行できるようにする
      throw e
    })
  }
  return dbPromise
}
