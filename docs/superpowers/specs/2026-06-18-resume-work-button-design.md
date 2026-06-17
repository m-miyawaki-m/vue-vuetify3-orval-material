# 作業再開ボタン 設計書

**作成日**: 2026-06-18
**対象プロジェクト**: vue-vuetify3-orval-material (Vue 3 + Vuetify 4 + Capacitor 7)

---

## 概要

ホーム画面のクイックスキャンボタン下に「作業再開」ボタンを追加する。中断した業務フロー（現時点はスキャナーのみ）の状態を localStorage に保持し、ボタンタップで作業を継続できるようにする。将来的に複数の業務フローへ拡張できる構造にする。

---

## 要件

- ホーム画面の QuickScannerButton 直下に ResumeWorkButton を常時表示する
- アクティブなセッションがない場合はボタンをグレーアウト（disabled）する
- セッションがある場合はラベルに作業名・件数・開始時刻を表示し、タップで対象ページへ遷移する
- セッション状態は localStorage に永続化し、アプリを再起動しても保持する
- スキャナーページでセッションの開始・更新・終了を行う
- ワークフロータイプは将来拡張できる構造（`type: 'scanner' | string`）にする

---

## 画面仕様

### ホーム画面

```
<MenuGrid />
<QuickScannerButton />    ← 既存（緑）
<ResumeWorkButton />      ← 新規（オレンジ/警告色）
```

**セッションなし時**
```
┌────────────────────────────┐
│  [ 作業なし ]  (disabled)  │  ← グレーアウト
└────────────────────────────┘
```

**セッションあり時（スキャナー例）**
```
┌────────────────────────────┐
│  📋  スキャナー作業を再開   │
│      3件 · 14:32 開始      │
└────────────────────────────┘
```

### ResumeWorkButton 仕様

| 項目 | 値 |
|---|---|
| 幅 | 全幅（QuickScannerButton と同一） |
| 高さ | `min-height: 160px` |
| アイコン | `mdi-clipboard-play`、サイズ 48px |
| ラベル | セッションなし: 「作業なし」 / セッションあり: 「{title}を再開」+ `{count}件 · {HH:MM} 開始` |
| 色 | セッションあり: `color="warning" variant="flat"` / セッションなし: `color="surface-variant" variant="flat" disabled` |
| 角丸 | `rounded="xl"` |
| タップ動作 | `router.push(sessionRoute)` （スキャナーの場合 `/scanner`） |
| ラッパーパディング | `0 24px 28px`（QuickScannerButton と統一） |

---

## データ設計

### `src/stores/workSessionStore.ts`（新規）

```ts
export interface ScannerSessionState {
  barcodes: string[]
  memo: string
}

export type WorkSessionType = 'scanner'

export interface WorkSession {
  id: string                   // crypto.randomUUID() で生成
  type: WorkSessionType
  title: string                // "スキャナー作業"
  route: string                // 遷移先パス（例: '/scanner'）
  startedAt: string            // ISO 8601 timestamp
  updatedAt: string            // ISO 8601 timestamp
  state: ScannerSessionState
}

// Store state
// currentSession: WorkSession | null  (persist: true)

// Computed
// hasActiveSession: currentSession !== null
// sessionLabel: "スキャナー作業を再開"
// sessionSubLabel: "3件 · 14:32 開始"

// Actions
// startScannerSession(): void   — 新規セッション作成（既存は上書き）
// updateBarcodes(barcodes: string[]): void  — バーコードリスト更新
// updateMemo(memo: string): void
// clearSession(): void          — セッション削除（作業完了時）
```

### セッションライフサイクル

| イベント | 操作 |
|---|---|
| スキャナーページ `onMounted`（セッションなし） | `store.startScannerSession()` |
| スキャナーページ `onMounted`（セッションあり） | ストア状態を使って復元（何もしない） |
| バーコードスキャン | `store.updateBarcodes([...])` |
| スキャナーページの「完了」ボタン | `store.clearSession()` → ホームへ遷移 |
| ホームへ戻る（バック操作） | 何もしない（ストアが自動保持） |

---

## コンポーネント構成

```
src/
├── stores/
│   └── workSessionStore.ts        # 新規
├── components/
│   └── menu/
│       └── ResumeWorkButton.vue   # 新規
└── pages/
    ├── HomePage.vue               # 変更：ResumeWorkButton 追加
    └── ScannerPage.vue            # 変更：セッション開始・更新・終了
```

---

## 変更ファイル詳細

### workSessionStore.ts（新規）

- `defineStore('workSession', ..., { persist: true })`
- `id` は `startScannerSession()` 呼び出し時に生成（`Date.now().toString(36)` で代替）
- `startedAt` / `updatedAt` は `new Date().toISOString()`
- `sessionSubLabel` は `startedAt` から `HH:MM` を抽出（`slice(11, 16)` で対応）

### ResumeWorkButton.vue（新規）

- `useWorkSessionStore()` を inject
- `store.hasActiveSession` が false のとき `disabled` prop を `v-btn` に渡す
- `store.hasActiveSession` が true のとき `store.currentSession.route` へ遷移

### HomePage.vue（変更）

```vue
<MenuGrid />
<QuickScannerButton />
<ResumeWorkButton />
```

### ScannerPage.vue（変更）

- `onMounted`: `if (!store.currentSession) store.startScannerSession()`
- バーコードスキャン時: `store.updateBarcodes(scannedList)`
- 「完了」ボタン: `store.clearSession()`

---

## スコープ外

- 複数セッションの並列保持
- セッション詳細の確認画面
- スキャナー以外のワークフロー実装（`WorkSessionType` の拡張のみ準備）
- スキャナーページの完全実装（別タスク）
