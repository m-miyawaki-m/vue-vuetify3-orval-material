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

## 構成

- `pages/` — 側(ガワ)のみ。各パターン=スキャン画面+結果画面の2ルート
- `components/` — props/emits のみの表示部品(store 非依存)
- `logic/` — 結線ロジック(useScanScreen/useResultScreen)・エンジン抽象化(useScanEngine)・
  パターン定義(patterns.ts)・値加工(parsers.ts)
- `stores/` — scanSessionStore(画面またぎ用・シリアライズ可能なデータのみ)

## 設計ポイント

- 新パターン追加 = patterns.ts に定義追加 + ページ2枚(既存部品の組み合わせ)+ ルート2本
- 種別(QR/バーコード/OCR)はフッターの「種別」メニューボタンで切替(タブは廃止)
- OCR 読取は誤読前提のため確認・修正フローが入る:
  - 連続系はシャッターごとに確認ダイアログ(値+項目編集)
  - 単発系は結果画面が編集フォームになる(lookup は編集で再照会)
- OCR は captureOcr() がダミー文字列を返すスタブ。実案件では Tesseract 等に差し替え
- 開発時(npm run dev)はカメラなしでも「疑似スキャン」入力で動作確認できる

詳細設計: `docs/superpowers/specs/2026-07-28-sample-scan-patterns-design.md`, `docs/superpowers/specs/2026-07-30-scan-type-footer-ocr-edit-design.md`
