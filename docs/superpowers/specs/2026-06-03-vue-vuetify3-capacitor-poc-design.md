# Vue + Vuetify3 + Capacitor Android PoC 設計書

**作成日:** 2026-06-03  
**目的:** Vue3 + Vuetify3 + Capacitor の技術スタックでモックUIのAndroidビルドが通ることを確認する  
**スコープ外:** Orval / 実APIとの通信 / 本番品質のエラーハンドリング

---

## 技術スタック

| 役割 | ライブラリ | バージョン目安 |
|------|-----------|--------------|
| UIフレームワーク | Vue 3 + TypeScript | 3.x |
| コンポーネント | Vuetify 3 | 3.x |
| ルーティング | Vue Router 4 | 4.x |
| 状態管理 | Pinia | 2.x |
| アイコン | Google Material Icons（Google Fonts CDN） + MDI フォールバック | — |
| ビルド | Vite | 5.x |
| ネイティブ化 | Capacitor 6 + @capacitor/android | 6.x |

---

## 構築手順

```bash
# 1. Vuetifyプロジェクト作成
npm create vuetify@latest
# 対話選択: TypeScript=Yes / Vue Router=Yes / Pinia=Yes / Install=Yes

cd vue-vuetify3-orval-material

# 2. Google Material Icons 追加
npm install material-icons

# 3. Capacitor 追加
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npx cap init "VuetifyPoC" "com.example.myapp" --web-dir dist

# 4. ビルド & Android プロジェクト生成
npm run build
npx cap add android
npx cap sync

# 5. Android Studio で開く
npx cap open android
```

---

## 設定ファイル

### `vite.config.ts` 追加設定
```ts
export default defineConfig({
  base: './',   // Capacitor用に相対パス指定
  // ...
})
```

### `capacitor.config.ts`
```ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.example.myapp',
  appName: 'VuetifyPoC',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
}

export default config
```

### `src/plugins/vuetify.ts` アイコン設定
```ts
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
})
```

### `src/main.ts` Material Icons CSS import
```ts
import 'material-icons/iconfont/material-icons.css'
// ... 既存のimport
```

> CDN（Google Fonts）ではなくnpmパッケージを使うことでオフライン（Android実機）でもアイコンが表示される。

---

## ディレクトリ構成

```
src/
├── assets/
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue       # 共通ヘッダー（v-app-bar）
│   │   └── AppFooter.vue       # 共通フッター（v-footer）
│   └── product/
│       ├── ProductCard.vue     # 商品カード（v-card）
│       └── ProductDialog.vue   # クイックビュー（v-dialog）
├── mocks/
│   └── products.ts             # モックデータ（50件）
├── pages/
│   ├── MenuPage.vue            # メニュー画面
│   ├── SearchPage.vue          # 検索・一覧画面
│   └── DetailPage.vue          # 詳細画面
├── router/
│   └── index.ts
├── stores/
│   └── product.ts              # Pinia store
├── types/
│   └── product.ts              # 型定義
├── App.vue
└── main.ts
```

---

## データモデル

### `src/types/product.ts`
```ts
export type ProductCategory = '食品' | '電子機器' | 'ファッション' | '家具' | 'スポーツ'

export interface Product {
  id: number
  name: string
  category: ProductCategory
  price: number
  inStock: boolean
  description: string
  rating: number
  reviews: Review[]
}

export interface Review {
  id: number
  author: string
  rating: number   // 1〜5
  comment: string
}
```

### `src/stores/product.ts` — 管理する状態
```ts
// state
{
  products: Product[]          // 全商品（モックデータで初期化）
  keyword: string              // 検索キーワード
  selectedCategory: string     // カテゴリ絞り込み（''=全件）
  inStockOnly: boolean         // 在庫ありのみ
  currentPage: number          // 現在ページ（1始まり）
  selectedProduct: Product | null  // ダイアログ・詳細表示対象
}

// getters
filteredProducts  // keyword + category + inStock で絞り込み
pagedProducts     // filteredProducts を 5件/ページ でスライス
totalPages        // filteredProducts.length / 5 の切り上げ
```

---

## 画面設計

### 画面遷移
```
MenuPage
  └─[商品を探すボタン]──→ SearchPage
                              ├─[カードクリック]──→ ProductDialog（ダイアログ）
                              └─[詳細を見るボタン]→ DetailPage
                                                       └─[戻るボタン]──→ SearchPage
```

### MenuPage
- `AppHeader` / `AppFooter`
- `v-card` × 2〜3枚でメニュー項目
- `v-btn`（SearchPageへ遷移）

### SearchPage — Vuetifyコンポーネント集中ページ

| エリア | コンポーネント | 役割 |
|--------|--------------|------|
| 検索エリア | `v-text-field` | キーワード入力 |
| | `v-expansion-panels`（アコーディオン） | 詳細検索の折りたたみ |
| | `v-radio-group` + `v-radio` | カテゴリ絞り込み |
| | `v-switch`（トグル） | 在庫ありのみ表示 |
| 一覧エリア | `ProductCard`（`v-card`） | 商品カード一覧 |
| | `v-pagination` | ページネーション |
| ダイアログ | `ProductDialog`（`v-dialog`） | カードクリックでクイックビュー |

### DetailPage

| エリア | コンポーネント | 役割 |
|--------|--------------|------|
| ページ全体 | `v-tabs` + `v-window` | 商品情報 / レビュー / 関連商品 |
| 商品情報タブ | `v-card` | 名前・価格・説明 |
| | `v-btn` | カートに追加（ダミー） |
| レビュータブ | `v-expansion-panels` | 各レビューをアコーディオンで表示 |
| | `v-radio-group` | 評価（星）フィルター |
| 関連商品タブ | `ProductCard` | 同カテゴリの商品カード |

---

## Androidビルド検証チェックリスト

- [ ] `npm run build` が成功する
- [ ] `npx cap sync` がエラーなく完了する
- [ ] Android Studio でビルドが通る
- [ ] エミュレーターで MenuPage・SearchPage・DetailPage が表示される
- [ ] ページ遷移（Menu→Search→Detail→Search）が動作する
- [ ] ダイアログが開閉する
- [ ] 検索・絞り込み・ページネーションが動作する
