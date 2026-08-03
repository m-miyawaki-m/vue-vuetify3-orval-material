# sample/scan ステップ式複数読み取りパターン(ペア読取)設計

日付: 2026-08-04
ステータス: 設計確定(承認済み)
関連: `2026-07-28-sample-scan-patterns-design.md`, `2026-07-30-ocr-shutter-footer-item-detail-design.md`

## 要件(ユーザー指示)

- 複数読み取りパターンを追加する: 1回目にバーコード、2回目に QR かバーコードを読み取る
- Stepper 的な導線表示で「今どのステップか・次に何を読むか」が分かる画面にする
- 単発ペア型(1組で結果画面へ)と連続ペア型(組をリスト蓄積して一括確定)の両方を作る
- ステップ2は QR とバーコードを同時待ち受け(切替操作不要)
- 導線 UI は Vuetify `v-stepper-header` + 案内文をカメラ上部に固定表示

## 方針

既存5パターン(single/list 系)には一切手を入れず、別モジュールとして追加する。
既存部品(`ScanCameraView`, `ScanManualInputDialog`, `ScanFixedLayout` 等)は再利用。

## 追加パターンとルート

| id | モード | フロー |
|---|---|---|
| `pair-single` | 単発ペア | ①バーコード → ②QR/バーコード → 結果画面(1組表示) |
| `pair-list` | 連続ペア | ①→②で1組完成 → リスト蓄積して①へ戻る → 読取完了で結果画面(一覧) |

- `/sample/scan/pair-single` → `PairSingleScanPage`
- `/sample/scan/pair-single/result` → `PairSingleResultPage`
- `/sample/scan/pair-list` → `PairListScanPage`
- `/sample/scan/pair-list/result` → `PairListResultPage`
- `ScanPatternIndexPage` にカード2枚追加(ステップ系はセクション分けか既存リスト続きに表示)

## ステップ定義とデータモデル

新規 `logic/stepPatterns.ts`:

```ts
export interface ScanStepDef {
  key: string            // 'first' | 'second'
  label: string          // ステッパー表示名 「バーコード」「QR/バーコード」
  guide: string          // 案内文 「1つ目のバーコードを読み取ってください」
  accept: 'barcode' | 'qr' | 'qr-or-barcode'
}

export interface StepScanPatternConfig {
  id: string
  title: string
  description: string
  icon: string
  mode: ScanSessionMode  // 'single' | 'continuous'
  steps: ScanStepDef[]   // 配列定義なので3ステップ以上にも拡張可
  scanPath: string
  resultPath: string
}
```

1組のデータは各ステップの読取値の配列(既存 `ScanItem` を再利用):

```ts
export interface ScanSetItem {
  parts: ScanItem[]  // steps と同じ順序
}
```

## store

既存 `scanSessionStore` は無改修。新規 `stores/stepScanSessionStore.ts`:

- state: `patternId`, `mode`, `currentStepIndex`, `parts: ScanItem[]`(進行中の組),
  `sets: ScanSetItem[]`(完成した組)。シリアライズ可能な値のみ(既存方針踏襲)
- getters: `hasSession`, `setCount`, `currentParts`
- actions:
  - `startSession(id, mode)` — 全リセットして開始
  - `addPart(item)` — 現ステップの値を積み `currentStepIndex++`
  - `completeSet()` — `parts` を `sets` へ移して `currentStepIndex = 0`, `parts = []`
  - `stepBack()` — 直前ステップの値を破棄して1つ戻る
  - `removeSet(index)`, `reset()`

## 読取エンジン対応(QR+バーコード同時待ち受け)

- `ScanType` union は変更しない。`useScanEngine` の formats 解決を拡張し、
  受付種別 `'qr-or-barcode'` のとき `[...QR_FORMATS, ...BARCODE_FORMATS]` を返す。
  既存3種(qr/barcode/ocr)の挙動は不変
- 実装形: `useScanEngine` の scanType 引数の型を `ScanType | 'qr-or-barcode'` に広げる
  (既存呼び出し側は無改修で型互換)
- formats は start 時固定のため、ステップ遷移時に `restart()` する(種別切替と同じ既存機構)
- ステップ画面に種別メニューボタン(`ScanTypeMenuButton`)は出さない — 種別はステップ定義が決める
- OCR はステップフロー対象外

## logic

新規 `logic/useStepScanScreen.ts`(既存 `useScanScreen` と同じ「ページはバインドするだけ」方針):

- `currentStep = computed(() => config.steps[store.currentStepIndex])`
- `handleScan(r)`: `addPart` → 最終ステップだったら組完成:
  - single: `completeSet()` して `router.push(resultPath)`
  - continuous: `completeSet()` + スナックバーで「1組追加」フィードバック、ステップ①へ戻る
- `stepBack()`: 組の途中なら直前ステップやり直し。連続型でステップ①かつ組が空のときは非活性
- 手入力: 既存 `ScanManualInputDialog` を流用し、submit を MANUAL として `handleScan` に流す
- `finish()`(連続のみ・1組以上で活性)/ `cancel()`(store リセットして戻る)
- カメラ起動失敗時は既存同様、手入力ダイアログへ自動フォールバック

## 画面構成

新規部品は `components/ScanStepHeader.vue` の1つだけ。
props: `steps: ScanStepDef[]`, `currentIndex: number` のみの表示専用部品(store 非依存)。
`v-stepper-header`(完了ステップにチェック)+現在ステップの `guide` 文を表示。

```
┌─────────────────────────┐
│ (✓)バーコード ──── (2)QR/バーコード │ ← ScanStepHeader
│ 「2つ目のコードを読み取ってください」    │
├─────────────────────────┤
│        カメラプレビュー          │ ← ScanCameraView(既存)
├─────────────────────────┤
│ 読取済み: ①4901234567890        │ ← 進行中の組の読取値(組数も連続型は併記)
├─────────────────────────┤
│ [キャンセル][1つ戻る][手入力][読取完了] │ ← 読取完了は連続型のみ
└─────────────────────────┘
```

- 進行中表示は軽量なテキスト行(`ScanSummaryBar` は流用せず、ステップ用の表示を
  `ScanStepHeader` 下部 or サマリー行として実装。組数は連続型のみ併記)
- フッター4要素の 390px/360px 収まりをブラウザ確認(クリップ時はラベル短縮)

## 結果画面

- `pair-single`: ステップの `label` を項目名にした2値のカード表示。
  「再スキャン」(スキャン画面へ戻る・セッション継続)+「完了」(reset して一覧へ)
- `pair-list`: 組ごとのカード一覧(①②の値を1カードに併記)。組削除ボタン、
  「確定」で reset して一覧へ。明細画面は作らない(1カードに全情報が収まるため。YAGNI)
- 直接 URL でセッションなしの場合はスキャン画面へリダイレクト(既存ガードと同方針)

## エラー・エッジケース

- ステップ2でステップ1と同じ値を読んでも受け付ける(重複判定はサンプル対象外)
- ステップ遷移中のカメラ restart は直列化(既存 `restart()` の機構どおり)
- ブラウザバック・キャンセルで store リセット

## テスト

既存テストは無改修。追加:

1. `stepPatterns`: 定義の妥当性(steps 数、accept 値、パス)
2. `stepScanSessionStore`: addPart で index が進む / completeSet で sets に移り index リセット /
   stepBack で直前値破棄 / removeSet / reset
3. `useStepScanScreen`: 最終ステップ読取で single は resultPath へ push、continuous は組追加して
   ステップ①へ / stepBack の活性条件 / 手入力が MANUAL として現ステップに入る
4. `ScanStepHeader`: 現在ステップの強調・完了チェック・guide 文表示
5. ページ: マウントして主要部品が構成されること(既存 scanPages.test の流儀)
6. ブラウザ確認: 疑似スキャンで ①→② の導線、連続型の組蓄積→確定、1つ戻る、
   カメラなしフォールバック、フッター収まり

## スコープ外

- OCR をステップに含めること
- ステップ2で読んだ値の重複・整合性チェック(業務判定)
- 連続ペア型の明細画面
- 3ステップ以上の実サンプル(定義上は拡張可能にしておく)
