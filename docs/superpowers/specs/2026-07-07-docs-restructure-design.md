# docs/ 再構成(目的別4分類) 設計

作成日: 2026-07-07
ステータス: 承認済み(実装待ち)

## 目的

docs/ 直下に 26 ファイルがフラットに並び、README の索引は 15 本のみ(11 本が索引漏れ)。
世代の違う資料(現行の正 / 旧方式 / 導入検討期の学習資料)が同格に混在し、
「どれが今の正か」が構造から読めない。目的別のフォルダに分け、README を導線として書き直す。

## 決定事項(ヒアリング結果)

| 論点 | 決定 |
|---|---|
| 整理の深さ | フォルダ分け(git mv)+ 索引再構築。内容の統合・削除はしない |
| フォルダ構成 | 目的別4分類(guides / design / reference / archive) |
| archive 資料 | 冒頭に2行のバナー注記を追加(内容は書き換えない) |
| superpowers/ | そのまま(点時記録)。内部の旧パス参照も修正しない |

## フォルダ構成と配置

`git mv` で移動(履歴保持)。

```
docs/
├─ README.md          ← 全面書き直し(用途別導線)
├─ guides/            現行の実務ガイド(迷ったらここ)
├─ design/            このアプリの設計書・定義書
├─ reference/         汎用の文法・概念リファレンス
├─ archive/           旧方式・導入検討期の資料(読む必要なし)
└─ superpowers/       そのまま(specs / plans)
```

| 移動先 | ファイル |
|---|---|
| guides/ | team-guide.md / common-layer-architecture.md / orval-zod-data-fetching-flow.md / new-page-flow.md / development-guide.md / theme-guide.md / vuetify-android-guide.md |
| design/ | architecture.md / component-tree.md / sequence.md / state-transition.md / screen-definition.md / store-definition.md |
| reference/ | vue-reference.md / vue-sequence.md / typescript-reference.md / vitest-reference.md / playwright-reference.md / vue-query-architecture.md |
| archive/ | testing-guide.md / vitest-guide.md / test-flow.md / why-orval-vue-query.md / http-client-comparison.md / openapi-orval-vue-query.md / orval-without-vue-query.md / component-sharing/(ディレクトリごと) |

分類の根拠:

- **guides**: 今ページを作る人が従う現行の正。
- **design**: このアプリ固有の仕様(画面・store・シーケンス)。
- **reference**: プロジェクト非依存の文法・概念解説。vue-query-architecture.md は概念深掘りとして現行でも有効なため reference(archive ではない)。
- **archive**: 旧テスト方式(testing-guide は「ts カバレッジ 100%」等の旧方針、vitest-guide / test-flow は「現行との差分」注記を既に持つ)と、orval 導入検討期の学習資料4本。component-sharing/ は教材シリーズとして archive に置くがバナーは付けない。

## README.md 全面書き直し

構成:

1. **用途別の入口(冒頭3行)**
   - ページを作る → `guides/team-guide.md`
   - 共通層の仕組みを知る → `guides/common-layer-architecture.md`
   - 画面・store の仕様を調べる → `design/`
2. **4分類の表**: フォルダの意味1行 + 各ファイル1行説明(現 README の説明文を流用しつつ全ファイル網羅)。archive は「読む必要なし。経緯を知りたいときだけ」と明記
3. **図の描画**: 現セクションを維持しつつ、「VS Code の標準 Markdown プレビューでそのまま表示できます」という不正確な記述を「Mermaid は Markdown Preview Mermaid Support 拡張(bierner.markdown-mermaid)を入れれば標準プレビューで表示可能。GitHub 上ではそのまま表示される」に修正

## archive バナー

archive 直下の 7 ファイルの先頭(タイトル行の直後)に追加:

```markdown
> **📦 アーカイブ資料**: この資料は〔理由〕のものです。現行は〔対応先〕を参照してください。
```

| ファイル | 理由 | 対応先 |
|---|---|---|
| testing-guide.md / vitest-guide.md / test-flow.md | 旧テスト方式 | `../guides/team-guide.md` の「5. テストの書き方」 |
| why-orval-vue-query.md / http-client-comparison.md / openapi-orval-vue-query.md / orval-without-vue-query.md | 導入検討期の学習資料 | `../guides/orval-zod-data-fetching-flow.md` と `../guides/common-layer-architecture.md` |

component-sharing/ にはバナーを付けない(README の分類説明のみ)。

## リンク・参照の修正

- docs 間の相対リンク(約30本)を移動後のパスへ修正。同一フォルダへ一緒に移動するもの
  (例: guides/ 内の team-guide ↔ common-layer-architecture)は相対リンクのままで有効なので変更不要。
  フォルダをまたぐもの(例: team-guide → vue-query-architecture は `../reference/` 前置)を修正
- `eslint.config.js` の `no-restricted-imports` メッセージ3箇所:
  `docs/team-guide.md 参照` → `docs/guides/team-guide.md 参照`
- `guides/team-guide.md` の「6. ESLint に怒られたら」はこのメッセージ文字列を表で引用しているため、
  引用3箇所も同じ文言に更新(メッセージと引用の不一致を作らない)
- `docs/superpowers/` 内の specs / plans からの旧パス参照は修正しない(点時記録)

## 検証

1. リンク切れチェック(bash ワンライナー): docs/ 配下の全 md から相対 `.md` リンクを抽出し、
   リンク元ファイルからの相対解決で実在確認。0 件になるまで修正
   (superpowers/ は対象外)
2. `npm run lint` / `npm run type-check` / `npm run test:run`(eslint.config.js を触るため全て確認)

## スコープ外

- 資料の統合・削除(テスト系5本→2本への統合など)
- 内容の書き換え(store-definition.md の現行化、旧資料の記述修正)。バナー追加と README 以外は不変
- superpowers/ 配下の整理
