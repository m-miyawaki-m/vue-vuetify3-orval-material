# クイックスキャン機能選択＋セット読み＋SQLite保持 設計書

**作成日**: 2026-07-07
**対象プロジェクト**: vue-vuetify3-orval-material (Vue 3 + Vuetify + Capacitor 7)

---

## 概要

クイックスキャンを「機能を選んでから連続スキャンする」業務フローに拡張する。

- クイックスキャンボタン → 機能選択画面（入荷・出荷・現品確認）
- 各機能は固定の項目列を持つ**セット読み**（1〜3個で1セット、次に読む項目をガイド表示）
- 読み取り結果は **SQLite** に即時保存し、作業中（未確定）・確定済みの両方を保持する
- 機能ごとに作業を並行して中断・再開できる

将来のサーバー送信キュー（オフライン同期）と Room（ネイティブ）実装への置き換えを見据えるが、本設計のスコープ外とする。

---

## 要件

- ホームのクイックスキャンボタンの遷移先を機能選択画面に変更する
- 機能選択画面に入荷・出荷・現品確認の3ボタンと、各機能の未確定セット数バッジを表示する
- 機能ごとに固定の項目列でセット読みを行う（ユーザーはセット数を選ばない）
  - 入荷 = 品番 → ロット → 数量（3個セット）※PoC 仮定義
  - 出荷 = 品番 → ロット（2個セット）
  - 現品確認 = 品番のみ（1個セット）
- セット読み中は「次に読む項目」をガイド表示する
- スキャンのたびに SQLite へ即時保存し、アプリ強制終了後も途中のセットから復元できる
- 確定ボタンで完成セットを `draft` → `confirmed` に更新する（レコードは削除しない）
- 機能ごとに draft を並行保持する。ホームの作業再開ボタンは直近更新の draft がある機能へ遷移する
- 既存の ScanListPage / ScanModePage / ScannerPage / scannerStore / useBarcodeScanner は変更しない

---

## アーキテクチャ

```
ホーム
 └ QuickScannerButton → /quick-scan  QuickScanMenuPage（新規）
                          ├ 📥 入荷 (バッジ: draft数)
                          ├ 📤 出荷
                          └ 🔍 現品確認
                               ↓
                        /quick-scan/:featureId  QuickScanWorkPage（新規）
                          カメラ + セット進行ガイド + 読み取り済みリスト + 確定
                               ↓ 全操作を即時書き込み
                        SQLite
                          @capacitor-community/sqlite（Android 実機）
                          jeep-sqlite（Web 開発時のブラウザフォールバック）
```

- カメラ制御は既存 `useBarcodeScanner`（ZXing）を再利用する
- 画面は `scanRecordRepository` 経由でのみ DB に触る（SQL を画面に書かない）

---

## 機能定義（`src/constants/scanFeatures.ts`）

```ts
export interface ScanFeatureItem {
  key: string      // 'part_no' | 'lot' | 'qty'
  label: string    // '品番' | 'ロット' | '数量'
}

export interface ScanFeature {
  id: string               // 'inbound' | 'outbound' | 'inspection'
  title: string            // '入荷' | '出荷' | '現品確認'
  icon: string             // mdi アイコン名
  color: string            // Vuetify テーマ色
  items: ScanFeatureItem[] // 1〜3項目。順序 = 読み取り順
}

export const scanFeatures: ScanFeature[] = [
  { id: 'inbound',    title: '入荷',     icon: 'mdi-package-down',      color: 'primary',
    items: [{ key: 'part_no', label: '品番' }, { key: 'lot', label: 'ロット' }, { key: 'qty', label: '数量' }] },
  { id: 'outbound',   title: '出荷',     icon: 'mdi-package-up',        color: 'success',
    items: [{ key: 'part_no', label: '品番' }, { key: 'lot', label: 'ロット' }] },
  { id: 'inspection', title: '現品確認', icon: 'mdi-magnify-scan',      color: 'warning',
    items: [{ key: 'part_no', label: '品番' }] },
]
```

機能の追加・項目変更は本ファイルの定義追加のみで済む構造とする。

---

## データ設計（SQLite）

### テーブル

```sql
CREATE TABLE IF NOT EXISTS scan_sets (
  id           TEXT PRIMARY KEY,   -- crypto.randomUUID()
  feature_id   TEXT NOT NULL,      -- 'inbound' | 'outbound' | 'inspection'
  status       TEXT NOT NULL,      -- 'draft' | 'confirmed'（将来 'synced' を追加）
  created_at   TEXT NOT NULL,      -- ISO 8601
  confirmed_at TEXT                -- 確定時刻。draft は NULL
);

CREATE TABLE IF NOT EXISTS scan_items (
  id         TEXT PRIMARY KEY,
  set_id     TEXT NOT NULL,        -- scan_sets.id（外部キー相当。PoC のため制約は張らない）
  seq        INTEGER NOT NULL,     -- 1〜3。feature.items の順序に対応
  item_key   TEXT NOT NULL,        -- 'part_no' | 'lot' | 'qty'
  value      TEXT NOT NULL,        -- 読み取り生値
  format     TEXT NOT NULL,        -- 'EAN_13' | 'QR_CODE' など
  scanned_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scan_sets_feature_status ON scan_sets(feature_id, status);
CREATE INDEX IF NOT EXISTS idx_scan_items_set ON scan_items(set_id);
```

### ライフサイクル

| イベント | DB 操作 |
|---|---|
| セットの1項目目を読む | `scan_sets` に draft INSERT ＋ `scan_items` に seq=1 INSERT |
| 2・3項目目を読む | `scan_items` に INSERT |
| セット削除（×ボタン） | 該当 set と items を DELETE |
| クリアボタン | その機能の draft の set / items を一括 DELETE（確認ダイアログあり） |
| 確定ボタン | 完成した draft のみ `status='confirmed'`, `confirmed_at` 設定 |
| 画面離脱・アプリ終了 | 何もしない（書き込み済みのため） |
| 画面再入場 | draft を SELECT して途中セット含め復元 |

- 未確定バッジ = `SELECT COUNT(*) FROM scan_sets WHERE feature_id=? AND status='draft'`
- 「完成セット」= items の件数が feature.items の項目数と一致する draft

### DB 層の構成

| ファイル | 責務 |
|---|---|
| `src/db/sqliteClient.ts` | 接続の初期化・シングルトン保持・テーブル作成（migration） |
| `src/db/scanRecordRepository.ts` | 上記ライフサイクルの CRUD 関数群。戻り値はアプリ内型（`ScanSet` / `ScanItem`） |

```ts
// scanRecordRepository.ts の公開関数（想定シグネチャ）
createDraftSet(featureId: string): Promise<ScanSet>
addItem(setId: string, item: { seq: number; itemKey: string; value: string; format: string }): Promise<ScanItem>
deleteSet(setId: string): Promise<void>
clearDrafts(featureId: string): Promise<void>
confirmCompletedDrafts(featureId: string, requiredCount: number): Promise<number> // 確定件数を返す
findDraftSets(featureId: string): Promise<ScanSetWithItems[]>
countDrafts(): Promise<Record<string, number>>          // featureId → draft数（バッジ用）
findLatestDraft(): Promise<ScanSetWithItems | null>     // 作業再開ボタン用
```

---

## 画面仕様

### QuickScanMenuPage（`/quick-scan`・新規）

```
┌ ← クイックスキャン ─────────┐
│ ┌─────────────────────────┐ │
│ │ 📥 入荷          (3)    │ │  ← 未確定3件バッジ
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 📤 出荷                 │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🔍 現品確認             │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- `scanFeatures` を v-for で描画（大型ボタン、既存 QuickScannerButton と同系の見た目）
- バッジは `countDrafts()` の結果。`onMounted` と画面復帰時に再取得
- タップで `/quick-scan/:featureId` へ遷移

### QuickScanWorkPage（`/quick-scan/:featureId`・新規）

```
┌ ← 入荷スキャン ────────────┐
│ [カメラ + スキャンフレーム] │  画面高さ 40% 程度
├─ 現在のセット ──────────────┤
│ ✅ 品番: 4901234567894      │
│ ⏳ 次は「ロット」を読み取り  │  ← ガイド表示
│ ○ 数量                     │
├─ 読み取り済み（draft 2件）──┤
│ セット#2 品番/ロット/数量 [×]│
│ セット#1 品番/ロット/数量 [×]│
├─ DEV only ──────────────────┤
│ [モック入力テキスト     ][確]│
├─────────────────────────────┤
│ [クリア]       [確定（2件）] │
└─────────────────────────────┘
```

**データフロー**

```
onMounted
  → findDraftSets(featureId) で復元
  → 途中セット（items < 項目数）があればそれを「現在のセット」として継続
  → カメラ起動

ZXing onScan(text, format)
  ├─ 直前の読み取りと同値なら無視（誤連射防止）
  ├─ 現在のセットがなければ createDraftSet → addItem(seq=1)
  ├─ あれば addItem(次の seq)
  └─ セット完成（items == 項目数）→ 読み取り済みリストへ移動、「現在のセット」をリセット

[×] → deleteSet（現在進行中のセットも削除可）
[クリア] → 確認ダイアログ → clearDrafts(featureId)
[確定] → confirmCompletedDrafts(featureId, feature.items.length) → スナックバー「N件確定しました」
        → 途中セットは draft のまま残る
```

**セット進行ロジックは composable `src/composables/useScanSetProgress.ts` に切り出す**（現在のセット状態・次項目の算出・完成判定を持つ純粋なロジック。DB もカメラも知らない）。

### ResumeWorkButton（変更）

- データソースを workSessionStore（localStorage）から SQLite の `findLatestDraft()` に変更
- 直近 draft がある場合：「{機能名}を再開 / N件 · HH:MM 開始」を表示、タップで `/quick-scan/:featureId`
- draft がない場合：従来どおり「作業なし」で disabled

### workSessionStore（廃止）

- `src/stores/workSessionStore.ts` を削除し、ScannerPage 内のセッション開始・更新・終了呼び出しも除去する
- `/scanner`（単発・生値返却）はセッション概念が不要なため機能影響なし

---

## SQLite 導入方針

- `@capacitor-community/sqlite` を導入（Android 実機ではネイティブ SQLite）
- Web 開発時は同プラグインの Web 実装（`jeep-sqlite` カスタム要素 + sql.js/WASM）を使い、`npm run dev` のブラウザでも同一コードで動作させる
  - `main.ts` で platform 判定して web のみ `jeep-sqlite` を初期化
  - WASM アセットは `public/assets` に配置（プラグイン公式手順に従う）
- 初期化は `sqliteClient.ts` に集約し、アプリ起動時ではなく**初回 DB アクセス時に遅延初期化**する（スキャン機能を使わない起動を遅くしない）

---

## エラーハンドリング

| ケース | 挙動 |
|---|---|
| カメラ拒否 | `useBarcodeScanner` の `error` を表示（既存画面と同様） |
| DB 初期化失敗 | 画面上部にエラーバナー表示、スキャン操作を無効化 |
| 同一値の連続読み取り | 直前の読み取り値と同じ場合は無視 |
| ZXing コールバック二重発火 | 既存の `completing` フラグパターンを踏襲 |
| 確定時に完成セットが0件 | 確定ボタンを disabled（押せない） |

---

## テスト方針

| 対象 | 方法 |
|---|---|
| `useScanSetProgress` | vitest 単体テスト（項目進行・完成判定・リセット） |
| `scanRecordRepository` | vitest。sqliteClient をインメモリ/モック実装に差し替えて CRUD とライフサイクルを検証 |
| `QuickScanMenuPage` / `QuickScanWorkPage` | 既存 `ScanModePage.test.ts` の流儀でコンポーネントテスト（repository・useBarcodeScanner をモック） |
| `ResumeWorkButton` | draft あり/なしの表示切り替えテスト（既存テストを SQLite モックに書き換え） |

---

## ファイル一覧

### 新規

| ファイル | 内容 |
|---|---|
| `src/constants/scanFeatures.ts` | 機能定義（3機能＋項目列） |
| `src/db/sqliteClient.ts` | SQLite 接続・テーブル作成 |
| `src/db/scanRecordRepository.ts` | scan_sets / scan_items の CRUD |
| `src/composables/useScanSetProgress.ts` | セット進行ロジック |
| `src/pages/QuickScanMenuPage.vue` | 機能選択画面 |
| `src/pages/QuickScanWorkPage.vue` | セット読み画面 |
| `src/types/quickScan.ts` | ScanSet / ScanItem / ScanSetWithItems 型 |

### 変更

| ファイル | 変更内容 |
|---|---|
| `src/components/menu/QuickScannerButton.vue` | 遷移先を `/scanner` → `/quick-scan` に変更 |
| `src/components/menu/ResumeWorkButton.vue` | データソースを SQLite（findLatestDraft）に変更 |
| `src/pages/ScannerPage.vue` | workSessionStore 呼び出しを除去 |
| `src/router/index.ts` | `/quick-scan`・`/quick-scan/:featureId` を追加 |
| `src/main.ts` | Web 時の jeep-sqlite 初期化 |
| `package.json` | `@capacitor-community/sqlite`・`jeep-sqlite` 追加 |

### 削除

- `src/stores/workSessionStore.ts`（および関連テスト）

### 変更なし

- `src/pages/ScanListPage.vue` / `src/pages/ScanModePage.vue`
- `src/stores/scannerStore.ts` / `scanListStore.ts` / `scanModeStore.ts`
- `src/composables/useBarcodeScanner.ts`

---

## スコープ外

- サーバーへの送信（`confirmed` → `synced` の同期処理・送信キュー実行）
- OCR での読み取り（ScanModePage 同様、将来対応）
- 数量などの手入力 UI（DEV モック入力欄のみ踏襲）
- Room（Android ネイティブ）実装への置き換え — DB 層を repository に隔離することで将来の差し替え点とする
- 機能・項目定義のサーバー配信（本設計では静的定義）
