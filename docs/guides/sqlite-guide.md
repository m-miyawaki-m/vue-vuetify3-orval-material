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
src/db/sqliteClient.ts           ← 接続・テーブル作成
  ↓
Android 実機: ネイティブ SQLite（/data/data/com.example.myapp/databases/quick_scanSQLite.db）
```

- DB 名は `quick_scan`（実ファイル名は `quick_scanSQLite.db`）
- 初期化は**初回 DB アクセス時に遅延実行**（10秒でタイムアウトし、失敗時は次回アクセスで再試行）
- **ブラウザ（`npm run dev`）では動かない**。`getDb()` が明示エラーを投げ、画面はエラーバナー表示になる。動作確認はエミュレータ/実機で行う（以前あった jeep-sqlite + WASM のブラウザ対応は 2026-07-08 に撤去）

### レイヤーの責務

| ファイル | 責務 | 触ってよい人 |
|---|---|---|
| `src/db/types.ts` | `DbExecutor`（run / query の2メソッド） | 基本変更しない |
| `src/db/sqliteClient.ts` | 接続シングルトン・migration | テーブル追加時のみ |
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

### 4-1. Android 実機 — Database Inspector【リアルタイム】

Android Studio でアプリをデバッグ実行 → View → Tool Windows → **App Inspection** → Database Inspector。
`quick_scanSQLite.db` のテーブルが live 表示され、クエリ実行・値の編集もできる。

### 4-2. Android 実機のファイルを吸い出して A5M2 / DB Browser で見る

```powershell
adb exec-out run-as com.example.myapp cat databases/quick_scanSQLite.db > quick_scan.db
```

あとは A5:SQL Mk-2（データベースの追加と削除 → SQLite）や DB Browser for SQLite で開く。

### 注意

- 4-2 で取り出したファイルは**その時点のスナップショット**。ツール上で編集してもアプリには反映されない（読み取り専用の確認用と割り切る）
- リアルタイムに見たいなら 4-1

---

## 5. データのリセット方法

| 環境 | 方法 |
|---|---|
| Android | 設定 → アプリ → アプリ情報 → ストレージ → データを消去 |
| コードから | `clearDrafts(featureId)` は draft のみ。全消しの関数は現状なし（必要になったら repository に追加） |

---

## 6. ハマりどころ（実際に踏んだもの）

### ブラウザ対応（jeep-sqlite + WASM）は撤去済み

2026-07-08 に撤去した。復活させる場合の注意: `public/assets/sql-wasm.wasm` は jeep-sqlite のグルーコードと**完全同一ビルド**の sql.js でなければならず、バージョン不一致だと ABI 不整合で初期化が永久ハングする（エラーにならず固まる。実測済み）。この保守コストが撤去理由の一つ。

### 初期化失敗の挙動

- 初期化は10秒でタイムアウトし、画面側（QuickScanWorkPage）はエラーバナー表示＋スキャン無効化
- 失敗後の再試行は接続の後始末（consistency チェック）込みで `getDb()` が面倒を見る

### 遷移中に表示するオーバーレイの close-on-back（関連バグの教訓）

DB とは直接関係ないが同機能で踏んだもの：ルート遷移中に表示される v-overlay（グローバルローディング）は `:close-on-back="false"` 必須。既定の true だと「戻る操作 → オーバーレイ表示 → Vuetify がその戻りナビゲーション自体をキャンセル」で戻れなくなる（`AppLoadingOverlay.vue` 参照）。
