# 新規ページ作成フロー

## フローチャート

```plantuml
@startuml new-page-flow
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam ArrowColor #90CAF9
skinparam ActivityBorderColor #90CAF9
skinparam ActivityBackgroundColor #263238
skinparam ActivityFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #E0E0E0

start

:openapi/api.yaml にエンドポイント定義を追加;
note right
  - path / method / parameters を記述
  - responses.schema に型定義
  - examples は $ref で外部JSONを参照
  例: $ref: './examples/orders-list.json'
end note

:openapi/examples/ にモックデータ JSON を作成;
note right
  Prism がそのまま返却するサンプルデータ
  例: openapi/examples/orders-list.json
end note

:npx orval を実行;
note right
  src/api/index.ts が自動更新される
  - 型定義 (interface)
  - axios ラッパー関数
  - getAppAPI() にメソッド追加
end note

:src/stores/xxx.ts を作成;
note right
  - getAppAPI() から API 関数を取得
  - ref<T[]>([]) で状態を定義
  - fetchXxx() で API 呼び出し
  - catch ブロックでフォールバック
end note

:src/pages/XxxPage.vue を作成;
note right
  - useXxxStore() で状態を参照
  - onMounted で fetchXxx() を呼ぶ
  - 一覧系 → MainLayout
  - 詳細・サブ画面 → SubLayout
end note

:src/router/index.ts にルートを追加;
note right
  { path: '/orders', component: OrderListPage }
  { path: '/orders/:id', component: OrderDetailPage, props: true }
end note

:src/data/main-menu.json のルートを更新;
note right
  該当する children の "to" を
  ComingSoonPage から実 URL へ変更するだけ
end note

:動作確認;
if (API サーバー起動中？) then (yes)
  :Prism でレスポンス確認\nnpx prism mock openapi/api.yaml;
else (no)
  :モックデータ(JSON)で\nフォールバック動作を確認;
endif

stop

@enduml
```

## 手順サマリー

| # | 作業対象 | 内容 |
|---|---------|------|
| 1 | `openapi/api.yaml` | エンドポイント・型・examples の定義 |
| 2 | `openapi/examples/xxx.json` | Prism 用モックレスポンスデータ |
| 3 | `npx orval` | 型定義 + axios 関数を自動生成 |
| 4 | `src/stores/xxx.ts` | Pinia store（API 呼び出し＋状態） |
| 5 | `src/pages/XxxPage.vue` | 画面コンポーネント |
| 6 | `src/router/index.ts` | ルート登録 |
| 7 | `src/data/main-menu.json` | メニュー導線の有効化 |

## 依存関係

```
openapi/api.yaml
  └─ npx orval
       └─ src/api/index.ts   ← 型定義 + getAppAPI()
            └─ src/stores/xxx.ts   ← 状態管理・API 呼び出し
                 └─ src/pages/XxxPage.vue   ← 表示
                      ├─ src/router/index.ts   ← ルーティング
                      └─ src/data/main-menu.json   ← メニュー導線
```

## Prism モックサーバー起動

```bash
npx prism mock openapi/api.yaml --port 4010
```

`src/plugins/axios.ts` の `baseURL` が `http://localhost:4010` を向いているため、
Prism 起動中は実 API レスポンスを返す。未起動時はフォールバック JSON を使用。
