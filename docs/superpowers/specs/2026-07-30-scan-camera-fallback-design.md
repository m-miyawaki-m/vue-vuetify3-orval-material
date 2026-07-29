# sample/scan カメラ起動失敗時のフォールバック設計

日付: 2026-07-30
ステータス: 設計確定(実装プラン作成前)
関連: `docs/superpowers/specs/2026-07-28-sample-scan-patterns-design.md`

## 背景・問題

スキャンパターン集(`src/sample/scan/`)でカメラ起動に失敗すると:

1. プレビュー枠下端に absolute の `v-alert` が被さり、見た目が崩れる
2. タブとカメラの間に大きな黒い空白がある(成功時も同様)。原因は Vuetify `v-tabs` の
   デフォルト `flex: 1 1 auto` が縦 flex(`.scan-fixed`)内で余白いっぱいに伸びるため
3. 読取手段がなくなり操作が詰む(DEV の疑似スキャン以外)

## 要件

- カメラ起動失敗時、プレビュー領域(40vh のまま)に ×(camera-off)プレースホルダーを表示
- 失敗検知時に手入力ダイアログを**自動表示**。閉じてもプレースホルダー内の
  「手入力する」ボタンからいつでも再表示できる
- 手入力値は既存の `scan` イベント経路に流し、パターン側(parser/resolver/モード)は無変更
- タブ伸長バグを修正(全状態でカメラがタブ直下に来る)
- 対象は `sample/scan` モジュールのみ。既存 `ScannerPage`/`ScanModePage` 等は触らない

## 変更内容

### 1. ScanTypeTabs.vue — タブ伸長修正

ルート `v-tabs` に `flex: none` を適用(scoped style)。

### 2. ScanCameraView.vue — ×プレースホルダー

`error` が非 null のとき:

- video・読取枠ガイド・トーチ・OCR シャッターを非表示
- プレビュー領域中央に縦並びで表示: `mdi-camera-off` アイコン(大)+ エラー文言
  (既存 `useBarcodeScanner` の error をそのまま)+「手入力する」ボタン
- absolute の `v-alert`(`.camera-error`)は廃止
- DEV 用疑似スキャン入力は従来どおり上部に残す

`watch(error)` で null → 非 null の変化を検知したらダイアログを自動 open。
「手入力する」ボタンでも open。

### 3. ScanManualInputDialog.vue — 手入力ダイアログ(新規部品)

props/emits のみの純粋部品(store・router 非依存)。

- props: `modelValue: boolean`(v-model で開閉)
- emits: `update:modelValue`, `submit(text: string)`
- 構成: v-dialog + テキストフィールド + 「追加」「閉じる」ボタン
- 「追加」: 空文字は無視。`submit` を emit し、**入力欄をクリアして開いたまま**
  (連続モードでの連続入力に対応。単発モードは親ページが結果画面へ遷移して
  アンマウントされるため自然に閉じる。モード prop は持たない)
- 「閉じる」: v-model を false に

`ScanCameraView` は `submit(text)` を受けて
`emit('scan', { text, format: 'MANUAL', timestamp: Date.now() })` に変換する。
これにより単発/連続・分割・API照会の全パターンが既存経路のまま動く。

## エラー文言

既存 `useBarcodeScanner` の error 文言(権限拒否/カメラなし/起動失敗)をそのまま表示。

## テスト

`src/sample/scan/__tests__/` に追加・拡張:

1. `ScanCameraView`(`useBarcodeScanner` モックの error ref を後から設定):
   - error 時にプレースホルダー(camera-off)が表示され video が非表示
   - error 検知でダイアログが自動表示される
   - ダイアログの submit で `scan` が `format: 'MANUAL'` で emit される
2. `ScanManualInputDialog` 単体: 入力→追加で `submit` emit+入力欄クリア、
   空文字では emit しない、閉じるで `update:modelValue(false)`
3. タブ flex 修正はブラウザ確認(修正後スクリーンショットで空白解消と
   失敗時レイアウトを確認)

## スコープ外

- 既存 `ScannerPage`/`ScanModePage`/`BarcodeInputField` への同等対応
- カメラ再試行ボタン(再入場で再起動されるため今回は作らない)
