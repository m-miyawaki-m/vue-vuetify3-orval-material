# クイックスキャン DB の Room 移行 設計書

**日付**: 2026-07-08
**目的**: クイックスキャンのローカル DB を、TS 直叩き（`@capacitor-community/sqlite`）から Android ネイティブの Room に置き換える。実案件（オフライン対応・Kotlin + Room）の構成を PoC として再現する。
**前提**: ブラウザ対応は撤去済み（2026-07-08）。動作確認はエミュレータ/実機のみ。

---

## 1. 決定事項

| 論点 | 決定 |
|---|---|
| ネイティブ言語 | **Kotlin**（実案件と同じ） |
| 既存 TS 実装 | **完全置き換え**。`@capacitor-community/sqlite`・`sqliteClient.ts`・`types.ts`（DbExecutor）を削除 |
| 既存データ移行 | **不要**。Room は新規 DB ファイル（`quick_scan.db`）を作り、旧 `quick_scanSQLite.db` は放置 |
| プラグイン API 粒度 | **業務 API 粒度**（案A）。`scanRecordRepository.ts` の8関数をそのままプラグインメソッドにする |
| 画面・composable | **無変更**。`scanRecordRepository.ts` の関数シグネチャを維持する |

### 検討して却下した案

- **汎用 SQL 実行プラグイン**（run/query だけネイティブに移す）: Room は SQL 文字列を外から受け取る用途に向かず、`@capacitor-community/sqlite` の再発明になるため却下
- **ユースケース API まで高レベル化**（seq 採番や確定判定もネイティブへ）: Vue の composable が持つ業務ルールの大移動になり、Room 練習という目的に過剰なため却下

---

## 2. レイヤー構成（変更後）

```
Vue 画面・composable（無変更）
  ↓ 関数呼び出し
src/db/scanRecordRepository.ts   ← シグネチャ維持。プラグイン呼び出しの薄い層に
  ↓ Capacitor ブリッジ
ScanRecordPlugin.kt              ← JSON ⇔ Kotlin 変換と resolve/reject のみ
  ↓
ScanRecordDao.kt                 ← 業務クエリ（Room DAO・suspend 関数）
  ↓
AppDatabase.kt（Room）→ /data/data/com.example.myapp/databases/quick_scan.db
```

SQL の置き場所が TS からネイティブ（DAO）へ移る。これが実案件の「Vue はネイティブの公開 API を呼ぶだけ」という形。

---

## 3. ネイティブ側（新規・パッケージ `com.example.myapp.db`）

| ファイル | 責務 |
|---|---|
| `ScanSetEntity.kt` | `scan_sets` テーブル。列は現行と同一（id / feature_id / status / created_at / confirmed_at）。日時は ISO 8601 文字列のまま |
| `ScanItemEntity.kt` | `scan_items`。**外部キー（set_id → scan_sets.id, onDelete = CASCADE）と index を `@Entity` で宣言**（現行スキーマからの改善） |
| `ScanSetWithItems.kt` | `@Relation` によるセット + items の一括取得定義 |
| `ScanRecordDao.kt` | 8操作の suspend 関数。`confirmCompletedDrafts` の HAVING クエリ・`findLatestDraft` の COALESCE(MAX) クエリは `@Query` に移植 |

> **実装との差分注記（レビュー指摘・2026-07-09 追記）**: 上表では当初 `deleteSet` / `clearDrafts` を `@Transaction` にする想定だったが、実装では外部キーの `ON DELETE CASCADE` により DELETE 1文で items もアトミックに削除されるため `@Transaction` は付与していない（`@Transaction` は `findDraftSets` / `findLatestDraft` など `@Relation` によるリレーション取得クエリ側に付与している）。DAO をこの spec の記述に合わせて修正しないこと。
| `AppDatabase.kt` | `@Database(version = 1)` のシングルトン。DB 名 `quick_scan.db` |
| `ScanRecordPlugin.kt` | `@CapacitorPlugin(name = "ScanRecord")`。各メソッドはコルーチン（Dispatchers.IO）で DAO を呼び、camelCase の JSObject にして resolve。**UUID・日時の生成はここ（ネイティブ側）に移動** |

- `MainActivity.java` に `registerPlugin(ScanRecordPlugin.class)` を追加（SampleSdk と同じパターン）
- CASCADE があるため DAO の `deleteSet` は親 DELETE 1文で items も消える
- 旧フォローアップ候補の `UNIQUE(set_id, seq)` は同期キュー着手時の課題なので**今回は入れない**

### プラグインメソッド（8個）

| メソッド | 対応する現行関数 | 備考 |
|---|---|---|
| `createDraftSet` | createDraftSet(featureId) | ScanSet を返す |
| `addItem` | addItem(setId, {seq,itemKey,value,format}) | ScanItem を返す |
| `deleteSet` | deleteSet(setId) | CASCADE 削除 |
| `clearDrafts` | clearDrafts(featureId) | CASCADE 削除（実装は @Transaction ではなく DELETE 1文。上の実装との差分注記を参照） |
| `confirmCompletedDrafts` | confirmCompletedDrafts(featureId, requiredCount) | 確定件数を返す |
| `findDraftSets` | findDraftSets(featureId) | ScanSetWithItems[]（items は seq 昇順） |
| `countDrafts` | countDrafts() | Record<featureId, number> |
| `findLatestDraft` | findLatestDraft() | ScanSetWithItems \| null |

---

## 4. ビルド設定

- `android/app/build.gradle` に Kotlin プラグイン + **KSP**（Room アノテーション処理）を追加
- 依存: `androidx.room:room-runtime` / `room-ktx` / KSP で `room-compiler` / `kotlinx-coroutines-android`
- Kotlin・KSP のバージョンは Capacitor 7 の AGP に合わせて実装計画で確定する
- gradle CLI 実行時は JAVA_HOME を Android Studio の JBR に向ける（既知の環境要件）

---

## 5. TS 側の変更

| ファイル | 変更 |
|---|---|
| `src/plugins/scanRecord.ts`（新規） | `registerPlugin<ScanRecordPlugin>('ScanRecord')` と8メソッドの型定義（SampleSdk の TS 側と同じパターン） |
| `src/db/scanRecordRepository.ts` | シグネチャ完全維持。中身をプラグイン呼び出しに差し替え。ネイティブが camelCase JSON を返すため `mapSet` / `mapItem` / `attachItems` は削除 |
| `src/db/sqliteClient.ts`・`src/db/types.ts` | 削除 |
| `package.json` | `@capacitor-community/sqlite` を削除 |

---

## 6. エラー処理

- ネイティブ例外は `call.reject(メッセージ)` → JS では例外として throw。画面側の既存ハンドリング（エラーバナー + スキャン無効化）がそのまま機能する
- Web（ブラウザ）: repository の各関数入口で `Capacitor.getPlatform() === 'web'` の場合に「SQLite はブラウザでは利用できません。エミュレータまたは実機で確認してください」を throw（現行挙動を維持）
- 現行の初期化10秒タイムアウトは撤去（WASM 起因のハング対策だったため不要）

---

## 7. テスト

- **TS 単体テスト**: `scanRecordRepository.test.ts` を書き直し。プラグインを `vi.mock` し、正しいメソッド・引数で呼ばれ戻り値が返ることを検証（SQL の正しさの検証責務はネイティブへ移動）
- **ネイティブ DAO テスト**: `androidTest` に Room in-memory DB の DAO テストを追加。対象は複雑クエリ2つ（`confirmCompletedDrafts` の HAVING、`findLatestDraft` の並び順）+ CASCADE 削除。`gradlew connectedAndroidTest` で実行（エミュレータ必要）
- **受け入れ確認**: エミュレータでスキャン → 保存 → アプリ再起動 → データ残存、確定・クリア操作、Database Inspector で `quick_scan.db` のテーブル確認

---

## 8. ドキュメント・後片付け

- `docs/guides/sqlite-guide.md` を Room 構成に全面改訂（Database Inspector・adb での確認方法は流用）
- メモリ（project_quick_scan_sqlite）の「Room 差し替え点」の記録を更新

## 9. スコープ外

- 既存データ（旧 `quick_scanSQLite.db`）の移行
- 同期キュー（confirmed → synced）と `UNIQUE(set_id, seq)`
- iOS 対応
