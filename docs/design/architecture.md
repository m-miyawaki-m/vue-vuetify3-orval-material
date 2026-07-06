# アーキテクチャ概要

## 技術スタック

| 分類 | 技術 |
|------|------|
| フレームワーク | Vue 3 (Composition API) |
| UI ライブラリ | Vuetify 3 |
| 状態管理 | Pinia |
| ルーティング | Vue Router 4（Hash History） |
| HTTP クライアント | Axios |
| API クライアント生成 | Orval v8.15.0 |
| OpenAPI | OpenAPI 3.0 (`openapi/api.yaml`) |
| モックサーバー | Prism |
| ビルドツール | Vite |
| テスト | Vitest + Vue Test Utils |
| 言語 | TypeScript |

---

## レイヤー構成図

```plantuml
@startuml architecture
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam ArrowColor #90CAF9
skinparam RectangleBorderColor #546E7A
skinparam RectangleBackgroundColor #263238
skinparam RectangleFontColor #E0E0E0
skinparam PackageBorderColor #1565C0
skinparam PackageBackgroundColor #0D1B2A
skinparam PackageFontColor #90CAF9

package "ブラウザ (SPA)" {

  package "View 層" {
    rectangle "Pages\n(src/pages/)" as pages
    rectangle "Components\n(src/components/)" as components
    rectangle "Layouts\n(MainLayout / SubLayout)" as layouts
  }

  package "ロジック層" {
    rectangle "Composables\n(src/composables/)" as composables
    rectangle "Utils\n(src/utils/)" as utils
    rectangle "Router\n(src/router/)" as router
  }

  package "状態管理層 (Pinia)" {
    rectangle "product store" as s_product
    rectangle "menu store\n(mainMenu)" as s_menu
    rectangle "scanner store" as s_scanner
    rectangle "memo store" as s_memo
    rectangle "workSession store" as s_work
    rectangle "theme store" as s_theme
    rectangle "settings store" as s_settings
    rectangle "menuStore\n(nav tabs)" as s_nav
  }

  package "API 層" {
    rectangle "src/api/index.ts\n(Orval 生成)" as api
    rectangle "src/plugins/axios.ts\n(interceptor)" as axios
  }

}

package "外部" {
  rectangle "Prism Mock Server\n:4010" as prism
  rectangle "本番 API サーバー" as backend
}

package "設計ファイル" {
  rectangle "openapi/api.yaml" as yaml
  rectangle "openapi/examples/*.json" as examples
}

pages --> components
pages --> layouts
pages --> composables
pages --> s_product
pages --> s_menu
pages --> s_scanner
pages --> s_memo
pages --> s_work
pages --> s_settings
components --> s_nav
api --> axios
axios --> prism : dev (fallback)
axios --> backend : prod
s_menu --> api
s_product --> api
yaml --> api : npx orval
examples --> prism

@enduml
```

---

## ディレクトリ構成

```
src/
├── api/
│   └── index.ts          # Orval 自動生成（触らない）
├── components/
│   ├── dialog/           # BaseDialog, ConfirmDialog
│   ├── layout/           # MainLayout, SubLayout
│   ├── menu/             # MenuGrid, QuickScannerButton, ResumeWorkButton
│   ├── product/          # ProductCard
│   ├── scanner/          # BarcodeInputField
│   ├── search/           # ProductFilterDialog, SearchConditionChips
│   ├── settings/         # SettingsThemePanel
│   └── ui/               # 汎用 Picker 系 (SelectPickerField, DatePickerField, etc.)
├── composables/
│   ├── useAsync.ts       # API 呼び出し共通ラッパー
│   ├── useBarcodeScanner.ts
│   └── useSnackbar.ts
├── data/
│   └── main-menu.json    # メインメニュー定義（API フォールバック）
├── mocks/
│   └── products-data.json # 商品モックデータ（API フォールバック）
├── pages/                # ルートに対応するページコンポーネント
├── plugins/
│   ├── axios.ts          # Axios インスタンス・インターセプター
│   └── vuetify.ts        # Vuetify 設定・テーマ定義
├── router/
│   └── index.ts          # Vue Router 定義
├── stores/               # Pinia stores
├── types/                # 共通型定義
└── utils/
    └── searchUtils.ts    # 検索フィルタ・クエリ生成
openapi/
├── api.yaml              # OpenAPI 定義（起点）
└── examples/             # Prism 用モックレスポンス
docs/                     # 本ドキュメント群
```

---

## データフロー概要

```
ユーザー操作
  │
  ▼
Page コンポーネント
  │  useXxxStore()
  ▼
Pinia Store
  │  getAppAPI().getXxx()
  ▼
src/api/index.ts (Orval 生成)
  │  customAxiosInstance()
  ▼
src/plugins/axios.ts
  │  baseURL: http://localhost:4010 (dev)
  ▼
Prism Mock Server / 本番 API
  │
  ▼  成功
Store に格納 → Page に反映
  │
  ▼  失敗（net::ERR_CONNECTION_REFUSED 等）
JSON フォールバック（src/mocks/ or src/data/）
```
