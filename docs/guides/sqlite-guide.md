# SQLite 操作ガイド（クイックスキャンのローカルDB）

**対象**: `@capacitor-community/sqlite` によるオフラインデータ保持の仕組み・操作方法・中身の確認方法
**関連実装**: `src/db/` 配下（2026-07-07 クイックスキャン機能で導入）
**設計書**: `docs/superpowers/specs/2026-07-07-quick-scan-sqlite-design.md`

---

## 1. 全体像

```
画面 (QuickScanWorkPage など)
  ↓ 関数呼び出しのみ（SQL は書かない）
src/db/scanRecordRepository.ts   ← SQL はここに集約（将来 Room に差し替える時の境界）
  ↓ DbExecutor インターフェース
src/db/sqliteClient.ts           ← 接続・テーブル作成・プラットフォーム差異の吸収
  ↓
Android 実機: ネイティブ SQLite（/data/data/com.example.myapp/databases/quick_scanSQLite.db）
Web 開発時 : jeep-sqlite + sql.js WASM（実体は IndexedDB 内にDBファイル丸ごと保存）
```

- DB 名は `quick_scan`（実ファイル名は `quick_scanSQLite.db`）
- 初期化は**初回 DB アクセス時に遅延実行**（10秒でタイムアウトし、失敗時は次回アクセスで再試行）
- Web では書き込みごとに `saveToStore` で IndexedDB へ永続化される

### レイヤーの責務

| ファイル | 責務 | 触ってよい人 |
|---|---|---|
| `src/db/types.ts` | `DbExecutor`（run / query の2メソッド） | 基本変更しない |
| `src/db/sqliteClient.ts` | 接続シングルトン・migration・Web対応 | テーブル追加時のみ |
| `src/db/scanRecordRepository.ts` | 業務CRUD関数（全SQL） | 機能追加時はここ |
| 画面・composable | repository の関数を呼ぶだけ | SQL 直書き禁止 |

---

## 2. テーブル定義

```sql
scan_sets (                          -- 1セット = 1〜3個の読み取り値のまとまり
  id           TEXT PRIMARY KEY,     -- crypto.randomUUID()
  feature_id   TEXT NOT NULL,        -- 'inbound' | 'outbound' | 'inspection'
  status       TEXT NOT NULL,        -- 'draft'(作業中) | 'confirmed'(確定済み)  ※将来 'synced'
  created_at   TEXT NOT NULL,        -- ISO 8601
  confirmed_at TEXT                  -- 確定時刻。draft は NULL
)

scan_items (                         -- セット内の各読み取り値
  id         TEXT PRIMARY KEY,
  set_id     TEXT NOT NULL,          -- scan_sets.id
  seq        INTEGER NOT NULL,       -- 1〜3。読み取り順
  item_key   TEXT NOT NULL,          -- 'part_no' | 'lot' | 'qty'
  value      TEXT NOT NULL,          -- 読み取り生値
  format     TEXT NOT NULL,          -- 'EAN_13' | 'QR_CODE' | 'MOCK' など
  scanned_at TEXT NOT NULL
)
```

### status のライフサイクル

```
スキャン1項目目 → draft の set + item を INSERT（以降スキャンごとに item INSERT）
確定ボタン     → 完成セット（items が定義項目数に達したもの）のみ status='confirmed'
                 ※削除ではなく更新。confirmed が将来のサーバー送信キューになる
×/クリア      → draft のみ DELETE（confirmed は消えない）
```

---

## 3. コードからの操作方法（repository API）

画面からは必ず `scanRecordRepository` の関数を使う。SQL を画面に書かない。

```ts
import {
  createDraftSet,           // (featureId) => ScanSet             draft セット作成
  addItem,                  // (setId, {seq,itemKey,value,format}) => ScanItem
  deleteSet,                // (setId) => void                    セット1件削除（items ごと）
  clearDrafts,              // (featureId) => void                その機能の draft 全削除
  confirmCompletedDrafts,   // (featureId, requiredCount) => 確定件数
  findDraftSets,            // (featureId) => ScanSetWithItems[]  created_at昇順・items seq昇順
  countDrafts,              // () => Record<featureId, number>    バッジ用
  findLatestDraft,          // () => ScanSetWithItems | null      作業再開ボタン用（直近更新）
} from '@/db/scanRecordRepository'
```

### 新しい操作・テーブルを追加するとき

1. テーブル追加は `sqliteClient.ts` の `MIGRATIONS` 配列に `CREATE TABLE IF NOT EXISTS ...` を追記
2. CRUD 関数は `scanRecordRepository.ts`（またはテーブル対応の新 repository ファイル）に追加
3. 行→アプリ内型のマッピング関数（snake_case → camelCase）を書く
4. テストは `getDb` を `vi.mock` して SQL 文字列・パラメータ・行マッピングを検証（`src/db/__tests__/scanRecordRepository.test.ts` が見本）

---

## 4. 中身を見る方法

### 4-1. ブラウザ開発時（`npm run dev`）— コンソールから直接 SQL【最速】

Vite はブラウザコンソールからソースを import できるので、アプリと同じ接続でクエリできる：

```js
// F12 → Console
const { getDb } = await import('/src/db/sqliteClient.ts')
const db = await getDb()

console.table(await db.query('SELECT * FROM scan_sets'))
console.table(await db.query('SELECT * FROM scan_items ORDER BY set_id, seq'))
await db.query("SELECT feature_id, status, COUNT(*) cnt FROM scan_sets GROUP BY feature_id, status")
```

repository 経由でも可：

```js
const repo = await import('/src/db/scanRecordRepository.ts')
await repo.findDraftSets('inbound')
await repo.countDrafts()
```

### 4-2. ブラウザのデータを A5M2 / DB Browser で見る（GUI 派）

データの実体は IndexedDB に「DBファイル丸ごとのバイナリ」で入っているため、まずファイルに書き出す。
DevTools コンソールで実行すると `quick_scan.db` がダウンロードされる：

```js
const req = indexedDB.open('jeepSqliteStore')
req.onsuccess = () => {
  const store = req.result.transaction('databases', 'readonly').objectStore('databases')
  const get = store.get('quick_scanSQLite.db')
  get.onsuccess = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([get.result]))
    a.download = 'quick_scan.db'
    a.click()
  }
}
```

あとは A5:SQL Mk-2（データベースの追加と削除 → SQLite）や DB Browser for SQLite で開く。

### 4-3. Android 実機 — Database Inspector【リアルタイム】

Android Studio でアプリをデバッグ実行 → View → Tool Windows → **App Inspection** → Database Inspector。
`quick_scanSQLite.db` のテーブルが live 表示され、クエリ実行・値の編集もできる。

### 4-4. Android 実機のファイルを吸い出して A5M2 で見る

```powershell
adb exec-out run-as com.example.myapp cat databases/quick_scanSQLite.db > quick_scan.db
```

### 注意

- 4-2 / 4-4 で取り出したファイルは**その時点のスナップショット**。ツール上で編集してもアプリには反映されない（読み取り専用の確認用と割り切る）
- リアルタイムに見たいなら 4-1（Web）か 4-3（Android）

---

## 5. データのリセット方法

| 環境 | 方法 |
|---|---|
| ブラウザ | DevTools → Application → IndexedDB → `jeepSqliteStore` を右クリック → Delete database（リロードで空DBが再作成される） |
| Android | 設定 → アプリ → アプリ情報 → ストレージ → データを消去 |
| コードから | `clearDrafts(featureId)` は draft のみ。全消しの関数は現状なし（必要になったら repository に追加） |

---

## 6. ハマりどころ（実際に踏んだもの）

### sql-wasm.wasm は差し替え禁止

`public/assets/sql-wasm.wasm` は **jeep-sqlite@2.8.0 のグルーコードと同一ビルド（sql.js@1.11.0、約652KB）** でなければならない。
sql.js 最新版の wasm に差し替えると **ABI 不一致で初期化が永久ハングする**（エラーにならず固まる。実測済み）。
jeep-sqlite をバージョンアップした場合は、対応する sql.js ビルドの wasm に合わせて更新すること。

### Web の永続化は saveToStore 前提

sql.js はメモリ上で動くため、書き込み後に `saveToStore` しないとリロードで消える。`sqliteClient.ts` の `run()` が毎回呼んでいるので、**DB アクセスを自前実装せず必ず sqliteClient 経由にする**こと。

### 初期化失敗の挙動

- 初期化は10秒でタイムアウトし、画面側（QuickScanWorkPage）はエラーバナー表示＋スキャン無効化
- 失敗後の再試行は接続の後始末（consistency チェック）込みで `getDb()` が面倒を見る

### 遷移中に表示するオーバーレイの close-on-back（関連バグの教訓）

DB とは直接関係ないが同機能で踏んだもの：ルート遷移中に表示される v-overlay（グローバルローディング）は `:close-on-back="false"` 必須。既定の true だと「戻る操作 → オーバーレイ表示 → Vuetify がその戻りナビゲーション自体をキャンセル」で戻れなくなる（`AppLoadingOverlay.vue` 参照）。
