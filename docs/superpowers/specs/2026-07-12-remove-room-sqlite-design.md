# Room/SQLite 除去 設計書

日付: 2026-07-12
ステータス: 承認済み

## 目的

プロジェクトから Room/SQLite の利用箇所を除去する。クイックスキャン機能（画面・フロー）は残し、保存層のみメモリ保持に置き換える。

## 背景

- クイックスキャン機能の下書き保存は Kotlin + Room + ScanRecord Capacitor プラグイン構成で実装されている（`docs/superpowers/specs/2026-07-08-room-migration-design.md`）
- Android 側の Kotlin ファイルはすべて Room 関連（`ScanRecordPlugin.kt` + `db/*.kt`）であり、Kotlin/KSP ツールチェーン自体が Room 移行のために導入された
- 今回は DB 層のみ除去し、`scanRecordRepository` をメモリ実装に差し替える（ユーザー決定）

## 方針

`src/db/scanRecordRepository.ts` の公開 API（8 関数）を維持したまま、中身をモジュール内 `Map` ベースのメモリ実装に差し替える。呼び出し側（`QuickScanMenuPage` / `QuickScanWorkPage` / `ResumeWorkButton`）は変更しない。Android 側は Room 移行を完全にロールバックする。

### 検討した代替案

- **Pinia ストアへ移行**: ページ 3 つ＋テスト 3 つに手が入り、除去タスクとしては過剰 → 不採用
- **@capacitor/preferences へ置換**: 永続化は維持できるが、ユーザーはメモリ保持を選択 → 不採用

## 変更内容

### フロント側

| ファイル | 変更 |
|---|---|
| `src/db/scanRecordRepository.ts` | メモリ実装に書き換え。ID は `crypto.randomUUID()`。`assertNative` は削除（ブラウザでも動作可能になる） |
| `src/db/__tests__/scanRecordRepository.test.ts` | プラグインモックを外し、メモリ実装の実挙動をテストする形に書き換え |
| `src/plugins/scanRecord.ts` | 削除 |

メモリ実装の仕様:

- モジュールレベルの `Map<string, ScanSetWithItems>` で下書きセットを保持
- 既存 API と同一のセマンティクスを維持する:
  - `createDraftSet(featureId)` — status `draft` のセットを新規作成
  - `addItem(setId, input)` — セットにアイテム追加
  - `deleteSet(setId)` — セット削除
  - `clearDrafts(featureId)` — 対象機能の draft を全削除
  - `confirmCompletedDrafts(featureId, requiredCount)` — アイテム数が requiredCount に達した draft を confirmed に更新し件数を返す
  - `findDraftSets(featureId)` — 対象機能の draft 一覧
  - `countDrafts()` — featureId ごとの draft 件数
  - `findLatestDraft()` — 最新の draft（なければ null）
- テスト用に状態リセット関数（`__resetForTest` 等）をエクスポートする

### Android 側（Room 移行の完全ロールバック）

| ファイル | 変更 |
|---|---|
| `android/app/src/main/java/com/example/myapp/db/`（6 ファイル） | 削除 |
| `android/app/src/main/java/com/example/myapp/ScanRecordPlugin.kt` | 削除 |
| `android/app/src/androidTest/java/com/example/myapp/db/ScanRecordDaoTest.kt` | 削除 |
| `MainActivity.java` | `registerPlugin(ScanRecordPlugin.class)` を削除（`SampleSdkPlugin` は残す） |
| `android/app/build.gradle` | `org.jetbrains.kotlin.android` / `com.google.devtools.ksp` プラグイン、Room・coroutines 依存、`kotlinOptions` を削除 |
| `android/build.gradle` | kotlin-gradle-plugin / ksp の classpath を削除 |
| `android/variables.gradle` | `roomVersion` / `coroutinesVersion` を削除 |

### ドキュメント

| ファイル | 変更 |
|---|---|
| `docs/guides/sqlite-guide.md` | 削除（実装がなくなり内容が誤りになるため） |
| Room/SQLite 関連の specs・plans 4 点、Capacitor 8 検討書 | 履歴として残置（当時の記録として扱う） |

## 挙動変化

1. アプリ再起動で下書きデータが消える（メモリ保持のため）
2. ブラウザでもクイックスキャンがエラーにならず動作する（`assertNative` 削除の副産物）

## 検証

- フロント: `vitest` 一式 ＋ 型チェック（`vue-tsc`）がグリーン
- Android: `gradlew assembleDebug` が成功（JAVA_HOME を Android Studio の JBR(21) に向けて実行）
- リポジトリ全体で `room` / `sqlite` の残存参照が specs・plans・Capacitor 8 検討書以外にないこと（`scanRecordRepository.ts` はファイル名・API 名を維持するため `ScanRecord` の語自体は残る。ScanRecord **プラグイン**への参照が消えていることを確認する）
