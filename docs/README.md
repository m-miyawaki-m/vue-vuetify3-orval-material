# ドキュメント一覧

## まずここから（用途別の入口）

- **ページを作る・修正する** → [guides/team-guide.md](./guides/team-guide.md)
- **共通層（データ取得・エラー処理）の仕組みを知る** → [guides/common-layer-architecture.md](./guides/common-layer-architecture.md)
- **画面・store の仕様を調べる** → [design/](#design--このアプリの設計書)

## guides/ — 現行の実務ガイド

今の開発ルール・手順の「正」。迷ったらここを読む。

| ファイル | 内容 |
|---------|------|
| [team-guide.md](./guides/team-guide.md) | チーム製造ガイド（ページの作り方・テストの書き方・ESLint 対応・FAQ）— **製造する人はまずこれ** |
| [common-layer-architecture.md](./guides/common-layer-architecture.md) | 共通層の設計意図・データフロー・エラー処理3段構えの全体像 |
| [new-page-flow.md](./guides/new-page-flow.md) | 新規ページ作成フローチャート（openapi.yaml 起点） |
| [development-guide.md](./guides/development-guide.md) | 部品の追加とカスタマイズ（ページ・タブ・ダイアログ・レイアウト） |
| [theme-guide.md](./guides/theme-guide.md) | テーマ・カラー制御（切り替え・追加・CSS 変数） |
| [vuetify-android-guide.md](./guides/vuetify-android-guide.md) | Android（Capacitor）での Vuetify コンポーネント可用性と注意点 |
| [capacitor-native-sdk-guide.md](./guides/capacitor-native-sdk-guide.md) | Capacitor 経由でネイティブ SDK（Java）を利用する概念と手順（SampleSdk エコー往復サンプル付き） |

### guides/data-fetching/ — データ取得スタック専門（orval + zod + vue-query + Pinia）

高度に専門的なため別ディレクトリに分離。入口は [data-fetching/README.md](./guides/data-fetching/README.md)（読む順つき索引）。

| ファイル | 内容 |
|---------|------|
| [vue-query-orval-zod-store-guide.md](./guides/data-fetching/vue-query-orval-zod-store-guide.md) | **入口**。4技術の責務分離と連携点の学習ガイド（学習順路・演習つき） |
| [orval-zod-data-fetching-flow.md](./guides/data-fetching/orval-zod-data-fetching-flow.md) | openapi.yaml → orval 生成 → composable → ページのデータ取得フロー（現行構成の解説） |
| [store-design-guide.md](./guides/data-fetching/store-design-guide.md) | Pinia store 設計ガイド（作成単位・作る/作らないの判断フロー・state/actions/getters・雛形） |
| [query-key-and-cache-lifecycle.md](./guides/data-fetching/query-key-and-cache-lifecycle.md) | queryKey の実形状とキャッシュ寿命の深堀り（staleTime / invalidate の波及 / keepPreviousData） |
| [testing-vue-query-composables.md](./guides/data-fetching/testing-vue-query-composables.md) | vue-query composable のテストの書き方深堀り（QueryClient 差し替え / モック境界 / mutation） |
| [add-endpoint-hands-on.md](./guides/data-fetching/add-endpoint-hands-on.md) | 新エンドポイント追加ハンズオン演習（yaml 追記 → 生成 → composable → ページ → テスト → Prism 確認） |

## design/ — このアプリの設計書

画面・store・フローの仕様。実装と突き合わせて読む。

| ファイル | 内容 |
|---------|------|
| [architecture.md](./design/architecture.md) | アーキテクチャ概要・技術スタック・レイヤー構成図・ディレクトリ構成 |
| [component-tree.md](./design/component-tree.md) | コンポーネントツリー（検索フロー・メニューフロー・レイアウト構造） |
| [sequence.md](./design/sequence.md) | シーケンス図（検索・スキャン・メインメニュー・登録バリデーション） |
| [state-transition.md](./design/state-transition.md) | 状態遷移図（画面遷移・スキャナー・ワークセッション・バリデーション） |
| [screen-definition.md](./design/screen-definition.md) | 画面項目定義書（全ページの入力項目・表示項目・操作） |
| [store-definition.md](./design/store-definition.md) | Store 定義書（全 Pinia store の State / Getters / Actions） |

PlantUML のソース（.puml）は [design/diagrams/](./design/diagrams/) にあります。

## reference/ — 汎用の文法・概念リファレンス

プロジェクトに依存しない文法・概念の解説。辞書的に使う。

| ファイル | 内容 |
|---------|------|
| [vue-reference.md](./reference/vue-reference.md) | Vue 3 文法・概念（Composition API / defineProps / スロット / Pinia / Router） |
| [vue-sequence.md](./reference/vue-sequence.md) | Vue 3 概念フロー シーケンス図（ライフサイクル / ref連鎖 / Props-Emits など10種） |
| [typescript-reference.md](./reference/typescript-reference.md) | TypeScript 文法・概念（型定義 / ジェネリクス / ユーティリティ型 / 型ガード） |
| [vitest-reference.md](./reference/vitest-reference.md) | Vitest 文法・パターン集（アサーション / モック / Vue Test Utils） |
| [playwright-reference.md](./reference/playwright-reference.md) | Playwright 文法・パターン集（操作 / アサーション / デバッグ） |
| [vue-query-architecture.md](./reference/vue-query-architecture.md) | vue-query（TanStack Query）の概念深掘り（キャッシュ / QueryKey / 状態機械） |

## archive/ — 旧方式・導入検討期の資料

**通常は読む必要なし。** 経緯や検討過程を知りたいときだけ。各ファイル冒頭に現行資料への案内あり。

| ファイル | 内容 |
|---------|------|
| [testing-guide.md](./archive/testing-guide.md) | 旧テスト方針（現行は team-guide の「5. テストの書き方」） |
| [vitest-guide.md](./archive/vitest-guide.md) | Vitest 詳細ガイド（旧方式の記述を含む） |
| [test-flow.md](./archive/test-flow.md) | 旧テスト作成フロー |
| [why-orval-vue-query.md](./archive/why-orval-vue-query.md) | orval + vue-query 採用理由の検討資料 |
| [http-client-comparison.md](./archive/http-client-comparison.md) | HTTP クライアント比較（Ajax / fetch / axios / async・await） |
| [openapi-orval-vue-query.md](./archive/openapi-orval-vue-query.md) | OpenAPI → orval → vue-query の網羅的解説（導入検討期） |
| [orval-without-vue-query.md](./archive/orval-without-vue-query.md) | vue-query を使わない構成の検討 |
| [component-sharing/](./archive/component-sharing/vol1-components/README.md) | コンポーネント共有の教材シリーズ（vol1: 部品 / vol2: テーマ / vol3: データ） |

## superpowers/ — 開発プロセスの記録

機能ごとの設計書（specs/）と実装計画（plans/）。作成時点の記録なので、実装の現状とは差分がありうる。

## 図の描画

- **Mermaid**（新しめの資料）: GitHub 上ではそのまま表示される。VS Code では
  [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
  拡張を入れると標準プレビュー（Ctrl+Shift+V）で表示できる
- **PlantUML**（design/ の図など）: [PlantUML 拡張](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)（Alt+D）、
  [オンライン](https://www.plantuml.com/plantuml/)、または
  [Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)
  （これ1つで PlantUML / Mermaid 両対応）
