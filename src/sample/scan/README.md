# スキャン画面パターン集

スキャン画面の典型パターンを部品+ロジックの組み合わせで構成したサンプルモジュール。
実案件へはこのディレクトリごとコピーして流用できる(依存: `@/composables/useBarcodeScanner`,
`@/composables/useSnackbar`, `@/components/layout/SubLayout.vue`, `@/composables/queries/useProductDetail`)。

## パターン(ルート: /sample/scan)

| id | モード | 加工 | 解決 |
|---|---|---|---|
| single-raw | 単発 | そのまま | そのまま |
| single-split | 単発 | 分割 | そのまま |
| single-lookup | 単発 | そのまま | API照会 |
| list-raw | 連続 | そのまま | そのまま |
| list-split | 連続 | 分割 | そのまま |

### ステップ式(複数読み取り)

| id | モード | ステップ |
|---|---|---|
| pair-single | 単発ペア | ①バーコード → ②QR/バーコード(同時待ち受け) |
| pair-list | 連続ペア | ①→②で1組をリストに蓄積し、一括確定 |

## 構成

- `pages/` — 側(ガワ)のみ。単発系=スキャン画面+結果画面の2ルート、連続系=スキャン画面+結果画面+明細画面の3ルート
- `components/` — props/emits のみの表示部品(store 非依存)
- `logic/` — 結線ロジック(useScanScreen/useResultScreen/useItemDetailScreen)・エンジン抽象化(useScanEngine)・
  パターン定義(patterns.ts)・値加工(parsers.ts)
- `stores/` — scanSessionStore(画面またぎ用・シリアライズ可能なデータのみ)

## 設計ポイント

- 新パターン追加 = patterns.ts に定義追加 + ページ2枚(既存部品の組み合わせ、連続系なら明細ページも)+ ルート2本(連続系ならルート1本追加)
- 種別(QR/バーコード/OCR)はフッターの「種別」メニューボタンで切替(タブは廃止)
- 手入力はフッターの「手入力」ボタンから常時可能(MANUAL は OCR 確認フローに入らない)。カメラ起動失敗時は自動でダイアログが開く
- OCR 読取は誤読前提のため確認・修正フローが入る:
  - 連続系はシャッターごとに確認ダイアログ(値+項目編集)
  - 単発系は結果画面が編集フォームになる(lookup は編集で再照会)
- OCR は captureOcr() がダミー文字列を返すスタブ。実案件では Tesseract 等に差し替え
- 開発時(npm run dev)はカメラなしでも「疑似スキャン」入力で動作確認できる
- ステップ式は stepPatterns.ts(steps 配列)+ useStepScanScreen/useStepResultScreen +
  stepScanSessionStore の別モジュール構成。導線は ScanStepHeader(v-stepper)で表示し、
  ステップの受付種別は accept('qr-or-barcode' は QR+バーコード同時待ち受け)で決まる

詳細設計: `docs/superpowers/specs/2026-07-28-sample-scan-patterns-design.md`, `docs/superpowers/specs/2026-07-30-scan-type-footer-ocr-edit-design.md`, `docs/superpowers/specs/2026-07-30-manual-input-footer-design.md`, `docs/superpowers/specs/2026-07-30-ocr-shutter-footer-item-detail-design.md`, `docs/superpowers/specs/2026-08-04-step-scan-patterns-design.md`
