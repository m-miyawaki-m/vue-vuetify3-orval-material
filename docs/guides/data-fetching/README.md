# data-fetching/ — orval + zod + vue-query + Pinia 専門ドキュメント

データ取得スタック（openapi.yaml → orval 生成 → vue-query → ページ、＋ zod 検証・Pinia との責務分離）に特化した専門資料。
ページを普通に作るだけなら [team-guide.md](../team-guide.md) で足りる。仕組みを理解・拡張したいときにここを読む。

## 読む順

| 順 | ファイル | 内容 |
|---|---------|------|
| 1 | [vue-query-orval-zod-store-guide.md](./vue-query-orval-zod-store-guide.md) | **入口**。4技術の責務分離と連携点・学習順路・演習 |
| 2 | [orval-zod-data-fetching-flow.md](./orval-zod-data-fetching-flow.md) | データ取得フローの全体像（シーケンス図・エラーフロー・API 変更手順） |
| 3 | [store-design-guide.md](./store-design-guide.md) | Pinia store 設計ガイド（作成単位は機能単位・作る/作らないの判断フロー・state/actions/getters の設計・雛形） |
| 4 | [query-key-and-cache-lifecycle.md](./query-key-and-cache-lifecycle.md) | queryKey の実形状とキャッシュ寿命の深堀り（staleTime / invalidate の波及 / keepPreviousData） |
| 5 | [testing-vue-query-composables.md](./testing-vue-query-composables.md) | vue-query composable のテストの書き方（QueryClient 差し替え / モック境界 / mutation） |
| 6 | [add-endpoint-hands-on.md](./add-endpoint-hands-on.md) | ハンズオン演習: 新エンドポイントを yaml 追記から画面・テスト・Prism 確認まで通す |

## 関連

- vue-query の一般概念（プロジェクト非依存）: [reference/vue-query-architecture.md](../../reference/vue-query-architecture.md)
- 共通層全体（エラー処理3段構え等）: [common-layer-architecture.md](../common-layer-architecture.md)
