# スキャン画面パターン 設計仕様

## 概要

既存の `ScannerPage`（単発スキャン・生値返却）を活かしつつ、2つの新規画面と1つのストア拡張を追加する。

---

## 対象スコープ

| # | 種別 | 内容 |
|---|---|---|
| 1 | 新規ページ | `ScanListPage` — 連続スキャン＋リスト一括返却 |
| 2 | 新規ページ | モード切替読み取り画面 — 単発・バーコード/QR/OCR切替・resolver 対応 |
| 3 | 新規ストア | `scanListStore`（ScanListPage 用） |
| 4 | 新規ストア | `scanModeStore`（モード切替画面用） |
| 5 | ルート追加 | `/scan-list`、`/scan-mode` |

**変更しないもの:** `ScannerPage.vue`・`scannerStore.ts`・`useBarcodeScanner.ts`

---

## 1. ScanListPage（連続スキャン＋リスト）

### ルート
`/scan-list`

### UI レイアウト

```
┌──────────────────────────────┐
│ ←  [title]                  │  toolbar
├──────────────────────────────┤
│                              │
│   [カメラ + スキャンフレーム] │  画面高さ45%
│                              │
├──────────────────────────────┤
│ スキャン済み（N件）           │
│  raw テキスト                │
│  resolver 結果 or ⏳ or ❌   │ [×]  ← 各アイテム削除可
│  ...                         │
├──────────────────────────────┤
│ [クリア]    [confirmLabel(N件)]│
└──────────────────────────────┘
```

### 呼び出し方

```ts
scanListStore.requestScanList({
  title: '入荷スキャン',
  confirmLabel: '入荷登録',              // 省略時: '確定'
  resolver: async (text) => getProduct(text),  // 省略可
  onConfirm: (items: ScanListItem[]) => { ... },
})
```

### 型定義（`src/types/scanList.ts`）

```ts
export interface ScanListItem {
  id: string            // `${timestamp}-${index}`
  raw: string           // バーコード生テキスト
  format: string        // 'QR_CODE' / 'EAN_13' / 'CODE_128' など
  timestamp: number
  resolved?: unknown    // resolver の返り値（呼び出し元がキャストして使う）
  resolving: boolean    // resolver 実行中
  resolveError?: string // resolver 失敗メッセージ
}

export interface ScanListOptions {
  title?: string
  confirmLabel?: string
  resolver?: (text: string) => Promise<unknown>
  onConfirm: (items: ScanListItem[]) => void
}
```

### データフロー

```
ZXing onScan(text)
  ├─ items.push({ id, raw, format, timestamp, resolving: true })
  └─ resolver あり？
       Yes → await resolver(text)
               成功 → item.resolved = result, item.resolving = false
               失敗 → item.resolveError = 'メッセージ', item.resolving = false
       No  → resolving = false（raw のみ）

[確定ボタン]
  → onConfirm(items)   ← resolving 中も含めて返す（呼び出し元が判断）
  → router.back()

[×ボタン]
  → items.splice(index, 1)

[クリアボタン]
  → items = []
```

### エラーハンドリング

| ケース | 挙動 |
|---|---|
| resolver 失敗 | アイテムに `❌ 取得失敗` 表示・削除可能・スキャンは継続 |
| カメラ拒否 | `useBarcodeScanner` の `error` をそのまま表示 |
| 確定時に resolving 中あり | そのまま返す（呼び出し元が判断） |

---

## 2. モード切替読み取り画面

### ルート
`/scan-mode`

### UI レイアウト

```
┌──────────────────────────────┐
│ ←  [title]            [🔦]  │  toolbar
├──────────────────────────────┤
│ [バーコード] [  QR  ] [ OCR ]│  モードタブ
├──────────────────────────────┤
│                              │
│   [カメラ + スキャンフレーム] │  残り全高
│                              │
│  （スキャン後: ⏳ オーバーレイ）│
├── DEV only ──────────────────┤
│ [モック入力テキスト      ][確]│
└──────────────────────────────┘
```

### モードタブ仕様

| タブ | ZXing フォーマット指定 | 動作 |
|---|---|---|
| バーコード | CODE_128 / EAN_13 / EAN_8 / UPC_A / UPC_E / CODE_39 | 1D バーコード読み取り |
| QR | QR_CODE | QR コード読み取り |
| OCR | ― | UI 表示のみ（「準備中」バナー）、カメラ停止 |

タブ切替時はカメラを再起動し、フォーマットヒントを切り替える。`defaultMode` はページ表示のたびにリセット（セッション内で記憶しない）。

### 呼び出し方

```ts
scanModeStore.requestScan({
  title: '商品バーコード',
  defaultMode: 'barcode',               // 'barcode' | 'qr' | 'ocr'
  resolver: async (text) => getProduct(text),  // 省略で生値返却
  onConfirm: (raw: string, resolved?: unknown) => { ... },
})
```

### 型定義（`src/types/scanMode.ts`）

```ts
export type ScanMode = 'barcode' | 'qr' | 'ocr'

export interface ScanModeOptions {
  title?: string
  defaultMode?: ScanMode   // 省略時: 'barcode'
  resolver?: (text: string) => Promise<unknown>
  onConfirm: (raw: string, resolved?: unknown) => void
}
```

### データフロー

```
ZXing onScan(text)
  ├─ カメラ停止
  ├─ resolver あり？
  │    Yes → オーバーレイ表示（⏳ 解決中）
  │           await resolver(text)
  │             成功 → onConfirm(text, resolved) → router.back()
  │             失敗 → スナックバーエラー → カメラ再起動（再試行可能）
  └─ No  → onConfirm(text, undefined) → router.back()
```

### エラーハンドリング

| ケース | 挙動 |
|---|---|
| resolver 失敗 | スナックバー表示→カメラ再起動（再スキャン可） |
| カメラ拒否 | `error` 表示（ScannerPage と同様） |
| OCR タブ選択 | 「この機能は準備中です」バナー表示、カメラは停止 |

---

## 3. ストア設計

### `scanListStore`（`src/stores/scanListStore.ts`）

```ts
defineStore('scanList', () => {
  const options = ref<ScanListOptions | null>(null)

  function requestScanList(opts: ScanListOptions) {
    options.value = opts
    router.push('/scan-list')
  }

  function complete(items: ScanListItem[]) {
    options.value?.onConfirm(items)
    options.value = null
    router.back()
  }

  function cancel() {
    options.value = null
    router.back()
  }

  return { options, requestScanList, complete, cancel }
})
```

### `scanModeStore`（`src/stores/scanModeStore.ts`）

```ts
defineStore('scanMode', () => {
  const options = ref<ScanModeOptions | null>(null)

  function requestScan(opts: ScanModeOptions) {
    options.value = opts
    router.push('/scan-mode')
  }

  function complete(raw: string, resolved?: unknown) {
    options.value?.onConfirm(raw, resolved)
    options.value = null
    router.back()
  }

  function cancel() {
    options.value = null
    router.back()
  }

  return { options, requestScan, complete, cancel }
})
```

---

## 4. ルーティング追加

`src/router/index.ts` に追記：

```ts
{ path: '/scan-list', component: () => import('@/pages/ScanListPage.vue') },
{ path: '/scan-mode', component: () => import('@/pages/ScanModePage.vue') },
```

---

## 5. ファイル一覧

### 新規作成

| ファイル | 内容 |
|---|---|
| `src/pages/ScanListPage.vue` | 連続スキャン＋リスト画面 |
| `src/pages/ScanModePage.vue` | モード切替読み取り画面 |
| `src/stores/scanListStore.ts` | ScanListPage 用ストア |
| `src/stores/scanModeStore.ts` | ScanModePage 用ストア |
| `src/types/scanList.ts` | ScanListItem / ScanListOptions 型 |
| `src/types/scanMode.ts` | ScanMode / ScanModeOptions 型 |

### 変更

| ファイル | 変更内容 |
|---|---|
| `src/router/index.ts` | `/scan-list`・`/scan-mode` ルート追加 |

### 変更なし

- `src/pages/ScannerPage.vue`
- `src/stores/scannerStore.ts`
- `src/composables/useBarcodeScanner.ts`

---

## 制約・注意事項

- OCR タブは UI のみ実装、実際の文字認識は将来対応
- `resolved` の型は `unknown`。呼び出し元でジェネリクスや型アサーションを使う
- `ScanListPage` の確定時、`resolving: true` のアイテムも返す（呼び出し元が制御）
- `completing` フラグパターン（ZXing 二重発火防止）は両画面ともに踏襲する
