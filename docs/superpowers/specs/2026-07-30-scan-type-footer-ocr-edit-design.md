# sample/scan 種別セレクタのフッター移動+OCR 確認・修正設計

日付: 2026-07-30
ステータス: 設計確定(実装プラン作成前)
関連: `2026-07-28-sample-scan-patterns-design.md`, `2026-07-30-scan-camera-fallback-design.md`

## 背景

- 画面上部の QR/バーコード/OCR タブ(`ScanTypeTabs`)は場所を取るわりに、どの種別でも
  「カメラの値をそのまま入れる」ことに変わりがなく、常設タブに値しない
- OCR は誤読が前提のため、読取値をそのまま確定せず、確認・手動修正の機会が必要

## 要件

1. タブを廃止し、種別選択をフッターのボタン(「種別: バーコード ▴」)に集約。
   タップで上方向にポップアップ(v-menu)し QR/バーコード/OCR を選択(現在値にチェック)
2. OCR 読取は全パターンで確認・手動修正可能にする:
   - 連続系(list-*): シャッターごとに確認ダイアログ(値+分割項目を編集)を挟み、
     「追加」でリストへ、「破棄」で捨てる
   - 単発系(single-*): 従来どおり結果画面へ遷移し、`format === 'OCR'` のときだけ
     値(+項目)を編集可能なフォーム表示に差し替える
3. QR/バーコード/手入力(MANUAL)/疑似スキャン(DEV)の経路は無変更
4. 対象は `src/sample/scan/` のみ

## 変更内容

### 新部品(いずれも props/emits のみ・store/router 非依存)

| 部品 | 役割 |
|---|---|
| `ScanTypeMenuButton.vue` | フッター用の種別ボタン。`v-model`(ScanType)。`v-menu location="top"` で QR/バーコード/OCR をリスト表示、現在値にチェック |
| `ScanValueEditForm.vue` | 値+項目の編集フォーム。props: `raw`, `fields`, `fieldDefs`, `parser`(関数 prop), `rawEditable`(default true)。**raw 編集で parser により項目を自動再分割**、項目の個別手修正も可。`rawEditable: false` のとき raw は読み取り専用表示(single-split の非 OCR 用)。emits: `update:raw`, `update:fields` |
| `ScanOcrConfirmDialog.vue` | 連続系の OCR 確認ダイアログ(v-dialog persistent + eager)。props: `modelValue`, `item: ScanItem | null`, `fieldDefs`, `parser`。内部に ScanValueEditForm。「追加」で編集後の `ScanItem` を `confirm` emit、「破棄」で `discard` emit。開閉は親制御(update:modelValue は出さない) |

### 廃止

- `ScanTypeTabs.vue` を削除(全スキャンページから除去)。カメラプレビューがヘッダー直下に上がる

### logic 変更(`useScanScreen.ts`)

- `pendingOcrItem: Ref<ScanItem | null>` を追加
- `handleScan`: `mode === 'continuous' && format === 'OCR'` のときは `addItem` せず
  `pendingOcrItem` に保持(それ以外は従来どおり)
- `confirmOcr(item: ScanItem)`: `addItem(item)` + pending クリア
- `discardOcr()`: pending クリア
- 戻り値に `pendingOcrItem` / `confirmOcr` / `discardOcr` / `parser`(config.parser)を追加

### ページ変更

- スキャンページ5枚: `ScanTypeTabs` 行を削除し、フッターに `ScanTypeMenuButton`
  (単発系 `[キャンセル][種別 ▴]`、連続系 `[キャンセル][種別 ▴][読取完了]`)。
  連続系2枚は `ScanOcrConfirmDialog` を配置(`:model-value="pendingOcrItem !== null"`)
- 単発結果画面3枚: `format === 'OCR'` のとき表示を `ScanValueEditForm` に差し替え
  - single-raw: 値のみ編集(fieldDefs 空)
  - single-split: 値+項目編集(非 OCR は従来どおり項目のみ = `rawEditable: false` で統一部品化)
  - single-lookup: 値編集で `productId` が再計算され**再照会**される(rawValue を ref 化)
- 編集値の確定時永続化はサンプル対象外(既存 single-split と同方針)

## テスト

1. `ScanTypeMenuButton`: 現在値表示、メニュー選択で `update:modelValue` emit
2. `ScanValueEditForm`: raw 編集→`update:raw`+再分割 `update:fields`、項目個別編集→マージ emit、`rawEditable: false` で raw 入力欄なし
3. `ScanOcrConfirmDialog`: item 表示、raw 編集後「追加」で編集反映済み ScanItem を confirm emit、「破棄」で discard emit
4. `useScanScreen`: 連続+OCR は pendingOcrItem に入り items 不変、confirmOcr で追加、discardOcr でクリア。単発+OCR は従来どおり遷移
5. ページ: 連続ページで OCR スキャン→ダイアログ表示→confirm でリスト追加。single-raw 結果画面で OCR 時に編集フォーム表示/非 OCR はカード表示
6. ブラウザ確認: フッターメニューでの種別切替、OCR シャッター→確認→追加、単発 OCR の結果画面編集

## スコープ外

- OCR 実読取(スタブのまま)
- 既存 ScannerPage/ScanModePage 系への同等対応
- 編集値の確定時永続化
