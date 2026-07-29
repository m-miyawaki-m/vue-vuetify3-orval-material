# sample/scan OCR シャッターのフッター移動+一覧→明細遷移設計

日付: 2026-07-30
ステータス: 設計確定(承認済み・マージまで自律実行)
関連: `2026-07-30-scan-type-footer-ocr-edit-design.md`, `2026-07-30-manual-input-footer-design.md`

## 要件(ユーザー指示)

1. OCR 時にプレビュー上へ重なっているカメラアイコンの FAB(シャッター)をフッターの
   ボタンエリアへ移動する
2. 連続読み取りの一覧(結果画面のカードリスト)から明細画面へ遷移できるようにする。
   カードをクリックで遷移し、遷移できることがアイコンで分かるようにする

## 機能1: OCR シャッターのフッター移動

- `ScanCameraView`: プレビュー上の `.shutter-btn` オーバーレイ(v-btn absolute)を削除し、
  `defineExpose({ captureOcr })` で撮影関数を公開(エンジン所有は変えない)
- スキャンページ5枚: `ScanCameraView` にテンプレート ref(`cameraRef`)を張り、フッターに
  **`scanType === 'ocr'` のときのみ表示**されるカメラアイコンボタンを追加:
  `<v-btn v-if="scanType === 'ocr'" class="shutter-btn" icon="mdi-camera" color="primary" @click="cameraRef?.captureOcr()" />`
- フッター構成(OCR 時): 単発 `[キャンセル][種別 ▴][手入力][📷]`、
  連続 `[キャンセル][種別 ▴][手入力][📷][読取完了]`。
  390px/360px 幅での収まりをブラウザ確認(クリップ時はラベル短縮で調整)
- 撮影後のフロー(連続=確認ダイアログ、単発=結果画面)・トーチ(プレビュー上のまま)・
  カメラ失敗時×プレースホルダーは変更しない

## 機能2: 一覧カード → 明細画面(連続系のみ)

### ルート

- `/sample/scan/list-raw/result/:index` → `ListRawItemDetailPage`
- `/sample/scan/list-split/result/:index` → `ListSplitItemDetailPage`
- `router/index.ts` に遅延 import で追加(catch-all より前)

### ScanItemList の変更

- カード右端(削除ボタンの下)に `mdi-chevron-right` アイコンを常時表示(遷移可能の明示)
- カード全体をクリック可能に(`link` 化+`@click` で emit `select(index)`)
- 削除ボタンは `@click.stop` で遷移を抑止

### logic

- `useResultScreen` に `openDetail(index: number)` を追加:
  `router.push(`${config.resultPath}/${index}`)`
- 新規 `useItemDetailScreen(config: ScanPatternConfig)`:
  - `useRoute()` の `params.index` を数値化し、`item = computed(() => store.items[index] ?? null)`
  - セッションが別パターン or index が範囲外なら `router.replace(config.resultPath)`
    (セッション自体がなければ resultPath 側のガードがさらにスキャン画面へ送る)
  - 戻り値: `{ item, index, title, fields }`

### 明細ページ(読み取り専用・薄い側)

```
┌─────────────────────────────┐
│ ←  連続 × 分割 - 明細 (1件目) │
├─────────────────────────────┤
│ ┌──────────────────────────┐│
│ │ 読取値 : ITEM01,LOT-A,12  ││
│ │ 形式   : QR_CODE          ││
│ │ 時刻   : 10:23:45         ││
│ ├──────────────────────────┤│
│ │ 商品コード: ITEM01        ││ ← fields があれば
│ │ ロット   : LOT-A          ││    ラベル付き縦表示
│ │ 数量     : 12             ││
│ └──────────────────────────┘│
└─────────────────────────────┘
```

- SubLayout(ヘッダ←で一覧へ戻る)+カード表示のみ。フッターなし。編集・削除は対象外(YAGNI)
- 結果ページ(ListRaw/ListSplit)は `ScanItemList` の `select` を `openDetail` に接続

## テスト

1. `ScanItemList`: カードクリックで `select(index)` emit / 削除ボタンクリックでは
   `select` が emit されない(remove のみ)/ chevron アイコンが表示される
2. `useItemDetailScreen`(または明細ページのマウントテスト):
   正常 index で item 表示 / 範囲外 index で `replace(resultPath)`
3. ページ: 結果ページのカード選択で `resultPath/:index` へ push される /
   明細ページ(ListSplitItemDetail)が raw・形式・fields を表示する
4. スキャンページ: フッター📷が OCR 選択時のみ表示され、押下で captureOcr 経由の
   scan フロー(確認ダイアログ表示)が動く。QR/バーコード時は表示されない
5. ブラウザ確認: OCR シャッター(フッター)→確認→追加、一覧カードタップ→明細→←で一覧、
   フッター5要素(連続 OCR)の 390px 収まり、横スクロールなし

## スコープ外

- 明細画面での編集・削除
- 単発系への明細追加(結果画面が詳細相当)
- トーチボタンの移動
