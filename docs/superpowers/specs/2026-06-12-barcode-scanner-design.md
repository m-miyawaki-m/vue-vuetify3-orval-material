# バーコード／QRコード スキャナー 設計書

**作成日:** 2026-06-12
**目的:** Vue3 + Vuetify4 + Capacitor7（Android）アプリに、バーコード・QRコードのカメラリアルタイム読み取り機能を追加する
**スコープ外:** OCR文字認識・画像ファイルアップロードからの解析

---

## 技術スタック

| 役割 | ライブラリ |
|------|-----------|
| バーコード解析 | `@zxing/browser` |
| カメラアクセス | WebRTC `getUserMedia`（ブラウザ・Capacitor WebView 両対応） |
| UIコンポーネント | Vuetify 4 `v-overlay` / `v-text-field` |

`@capacitor/camera`（既存）は写真1枚撮影用のため本機能では使用しない。
`@zxing/browser` は `npm run dev` のブラウザ環境でもそのままテスト可能。

---

## アーキテクチャ

```
src/
  components/scanner/
    BarcodeScannerOverlay.vue   ← フルスクリーンカメラオーバーレイ（汎用）
    BarcodeInputField.vue       ← フォーム入力欄 + スキャンボタン
  composables/
    useBarcodeScanner.ts        ← ZXing BrowserMultiFormatReader ラッパー
  types/
    scanner.ts                  ← ScanResult 型定義
```

### コンポーネント関係

```
BarcodeInputField.vue
  ├─ v-text-field（入力欄）
  └─ BarcodeScannerOverlay.vue（mode="single"、内部で保持）

BarcodeScannerOverlay.vue（単体でも使用可）
  └─ useBarcodeScanner.ts
```

---

## 型定義（`types/scanner.ts`）

```ts
export interface ScanResult {
  text: string       // 読み取り結果文字列
  format: string     // 'QR_CODE' | 'EAN_13' | 'CODE_128' など
  timestamp: number  // Date.now()
}
```

---

## BarcodeScannerOverlay.vue

### Props

| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `modelValue` | `boolean` | — | v-model で開閉制御 |
| `mode` | `'single' \| 'continuous'` | — | スキャンモード（必須） |
| `title` | `string` | `'バーコード スキャン'` | ヘッダータイトル |
| `formats` | `BarcodeFormat[]` | 主要全フォーマット | 読み取り対象フォーマット |

### Emits

| イベント | 引数 | タイミング |
|---------|------|-----------|
| `update:modelValue` | `boolean` | 開閉時 |
| `scan` | `ScanResult` | 1件スキャンするたびにリアルタイム発火 |
| `complete` | `ScanResult[]` | continuous モードで「完了」ボタン押下時 |

### モード別の動作

- **single**: 1件読み取ったら `scan` emit → 自動クローズ
- **continuous**: 読むたびに `scan` emit、内部履歴リストへ追加。「完了」押下で `complete` emit → クローズ。履歴内の各行に「× 削除」ボタンを持ち完了前に誤読みを除外できる

### UI構成

```
v-overlay（fullscreen）
  ├─ ツールバー: ← キャンセル/完了 | タイトル | 🔦 ライトトグル
  ├─ video要素（カメラ映像）
  │    └─ スキャン枠オーバーレイ（コーナーブラケット + スキャンライン）
  ├─ [continuous のみ] スキャン済み履歴リスト（× 削除付き）
  └─ [continuous のみ] アクションバー: 🗑 クリア | ✓ 完了（N件）
```

---

## BarcodeInputField.vue

### Props

| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `modelValue` | `string` | — | v-model（入力値） |
| `label` | `string` | `undefined` | フィールドラベル |
| `placeholder` | `string` | `undefined` | プレースホルダー |
| `hint` | `string` | `undefined` | ヒントテキスト |
| `clearable` | `boolean` | `false` | クリアボタン表示 |
| `disabled` | `boolean` | `false` | 無効化 |
| `formats` | `BarcodeFormat[]` | 主要全フォーマット | 読み取り対象フォーマット |

### Emits

| イベント | 引数 | タイミング |
|---------|------|-----------|
| `update:modelValue` | `string` | 入力またはスキャン後 |
| `scan` | `ScanResult` | スキャン成功時（生データも必要な場合向け） |

### 動作

v-text-field の append-inner にスキャンボタン（バーコードアイコン）を配置。
ボタン押下で内部の `BarcodeScannerOverlay`（mode="single"）を開く。
読み取り成功 → `emit('update:modelValue', result.text)` → オーバーレイ自動クローズ。

---

## useBarcodeScanner.ts

```ts
function useBarcodeScanner(
  videoRef: Ref<HTMLVideoElement | null>,
  options: {
    formats?: BarcodeFormat[]
    onScan: (result: ScanResult) => void
  }
): {
  start: () => Promise<void>
  stop: () => void
  isScanning: Ref<boolean>
  error: Ref<string | null>
}
```

`BrowserMultiFormatReader` を生成・保持し、`start()` でデコードループ開始、`stop()` でストリーム停止とリソース解放を行う。
`onUnmounted` で自動的に `stop()` を呼び出す。

---

## エラーハンドリング

| ケース | ユーザーへの表示 |
|--------|----------------|
| カメラ権限拒否 (`NotAllowedError`) | オーバーレイ内にエラーメッセージ + 「設定を開く」ボタン |
| カメラデバイスなし (`NotFoundError`) | 「カメラが使用できません」メッセージ |
| スキャン失敗（NotFoundException） | 無視して継続（エラー表示なし・デコードループ継続） |

---

## テスト戦略

| 環境 | 方法 |
|------|------|
| `npm run dev`（ブラウザ） | PCのWebカメラでQR・バーコードをかざしてテスト |
| Android エミュレータ | 仮想カメラ or 別デバイスにバーコード画像を表示してスキャン |
| Android 実機 | `npx cap run android` で通常テスト |

---

## 使用例

```vue
<!-- フォームに埋め込む（single） -->
<BarcodeInputField
  v-model="productCode"
  label="バーコード / QR"
  clearable
/>

<!-- 連続スキャン → テーブルへ追加 -->
<v-btn @click="scannerOpen = true">連続スキャン</v-btn>
<BarcodeScannerOverlay
  v-model="scannerOpen"
  mode="continuous"
  @scan="onScanRealtime"
  @complete="rows.push(...$event)"
/>
```
