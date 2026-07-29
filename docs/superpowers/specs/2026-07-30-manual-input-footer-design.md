# sample/scan 手入力のフッターボタン常設設計

日付: 2026-07-30
ステータス: 設計確定(ユーザー指示によりドキュメント→実装→マージまで自律実行)
関連: `2026-07-30-scan-camera-fallback-design.md`, `2026-07-30-scan-type-footer-ocr-edit-design.md`

## 背景・要件(ユーザー指示)

- 手入力をフッターのボタンに常設する(現状はカメラ起動失敗時のみの導線)
- 手入力押下でダイアログ表示 → 値入力 → 確定で読取値として確定
- 連続モードならリストに追加(ダイアログは開いたまま連続入力)
- 分割パターンは従来どおり parser で分割(カンマ区切り・暫定でよい)

## 設計

### 手入力状態の所有を ScanCameraView からページ側(logic)へ移動

現状 `ScanManualInputDialog` は `ScanCameraView` 内部にあり、カメラ error 時のみ開ける。
フッター(ページ側)から開くため、**ダイアログの所有をスキャンページへ移し、
開閉状態と submit 処理を `useScanScreen` に置く**:

- `useScanScreen` に追加:
  - `manualOpen: Ref<boolean>`
  - `openManual()`: `manualOpen.value = true`
  - `handleManualSubmit(text: string)`: `handleScan({ text, format: 'MANUAL', timestamp: Date.now() })`
    (単発は既存フローで結果画面へ遷移=ページごとアンマウントでダイアログも消える。
    連続は addItem され、ダイアログ側が入力欄をクリアして開いたまま=連続入力。
    分割は toItem 内の `config.parser` で従来どおり分割。
    **MANUAL は OCR 確認フローに入らない**(ユーザー自身が入力した値のため))

### ScanCameraView の変更

- 内部の `ScanManualInputDialog` と `manualOpen`/`onManualSubmit` を削除
- 代わりに `manual-request` イベントを emit:
  - カメラ error 検知時(`watch(error)`)に emit(従来の自動表示を維持)
  - ×プレースホルダーの「手入力する」ボタン(`.manual-btn`)押下時に emit
- 外部インターフェース: props `{ scanType }`、emits `scan` / `manual-request`

### ページの変更(スキャンページ5枚)

- `ScanManualInputDialog` をページに配置:
  `<ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />`
- `ScanCameraView` に `@manual-request="openManual"` を追加
- フッターに手入力ボタンを追加(アイコン `mdi-keyboard-outline` + ラベル「手入力」、
  class `.manual-input-btn`):
  - 単発系: `[キャンセル][種別 ▴][手入力]`
  - 連続系: `[キャンセル][種別 ▴][手入力][読取完了]`
    (v-bottom-navigation のスタック表示で幅を確保。ラベルはすべて短語)

### 変更しないもの

- `ScanManualInputDialog` 本体(そのまま流用: 追加で入力欄クリア+開いたまま、閉じるで閉)
- QR/バーコード/OCR の読取経路、OCR 確認フロー、結果画面

## テスト

1. `useScanScreen`(screenLogic.test.ts 追記):
   - `openManual` で `manualOpen` が true
   - `handleManualSubmit`: 単発 → setSingleResult(format MANUAL)+結果画面へ遷移 /
     連続 → items に追加(分割パターンなら fields が分割済み)・pendingOcrItem に入らない
2. `ScanCameraView`(既存テスト改修): ダイアログ内包テストを `manual-request` emit 検証に置換
   - error 検知で `manual-request` が emit される
   - `.manual-btn` クリックで `manual-request` が emit される
3. ページ(scanPages.test.ts 追記):
   - フッターの `.manual-input-btn` クリックでダイアログ(ScanManualInputDialog)の modelValue が true
   - ダイアログ submit → 単発は結果画面へ push / 連続はリストに追加(分割 fields 付き)
   - ScanCameraView の manual-request でもダイアログが開く
4. ブラウザ確認: カメラ正常時にフッター手入力→入力→単発確定/連続で連続追加、
   カメラ失敗時の自動表示と×プレースホルダー導線が従来どおり動くこと

## スコープ外

- 手入力値のバリデーション(空文字無視は既存ダイアログの挙動のまま)
- 結果画面・OCR フローの変更
