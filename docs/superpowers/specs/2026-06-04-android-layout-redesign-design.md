# Android レイアウト再設計 設計仕様

## 概要

Vuetify 4 + Capacitor の Android アプリ向けに、全画面共通で使えるレイアウトテンプレートを設計する。
ボトムナビゲーション（4タブ）を持つ `MainLayout` と、スタック遷移用の `SubLayout` の2種類を導入し、既存の `AppHeader` / `AppFooter` を置き換える。汎用ダイアログ基盤（`BaseDialog`）も合わせて整備する。

---

## ナビゲーション方針

- **ボトムナビゲーション（4タブ）** を採用。親指で操作しやすい Android 標準パターン。
- タブ画面（ホーム・検索・お気に入り・設定）は **MainLayout** を使用。
- 詳細など深い階層の画面は **SubLayout** を使用（BottomNav 非表示、戻るボタン付き）。
- サブエリア（フィルタ等）は常時固定せず、必要な画面でページ内コンポーネントまたは `v-bottom-sheet` でオンデマンド表示する。

---

## コンポーネント構成

### MainLayout.vue

タブ画面（BottomNav を持つ画面）用のレイアウト。

**Props:**
| name | type | required | 説明 |
|---|---|---|---|
| `title` | `string` | ✓ | AppBar に表示するタイトル |

**Slots:**
| name | 説明 |
|---|---|
| `default` | メインコンテンツ |
| `actions` | AppBar 右側のアイコン等（省略可） |

**内部構造:**
```
v-layout
  v-app-bar (color="primary")
    title prop
    #append: actions slot
  v-main
    default slot
  v-bottom-navigation (BottomNav 4タブ)
```

**BottomNav タブ定義:**
| アイコン | ラベル | to |
|---|---|---|
| `mdi-home` | ホーム | `/` |
| `mdi-magnify` | 検索 | `/search` |
| `mdi-heart` | お気に入り | `/favorites` |
| `mdi-cog` | 設定 | `/settings` |

---

### SubLayout.vue

スタック遷移する画面（詳細など）用のレイアウト。BottomNav を持たない。

**Props:**
| name | type | required | 説明 |
|---|---|---|---|
| `title` | `string` | ✓ | AppBar に表示するタイトル |

**Slots:**
| name | 説明 |
|---|---|
| `default` | メインコンテンツ |

**内部構造:**
```
v-layout
  v-app-bar (color="primary")
    #prepend: 戻るボタン (router.back())
    title prop
  v-main
    default slot
```

---

### ダイアログコンポーネント

#### BaseDialog.vue

全ダイアログの基盤となる汎用ダイアログ。

**Props:**
| name | type | default | 説明 |
|---|---|---|---|
| `modelValue` | `boolean` | — | v-model（表示/非表示） |
| `title` | `string` | — | ダイアログタイトル |
| `maxWidth` | `string` | `'500px'` | ダイアログ最大幅 |

**Slots:**
| name | 説明 |
|---|---|
| `default` | 本文エリア |
| `actions` | アクションボタンエリア（フッター） |

**Emits:**
| name | 説明 |
|---|---|
| `update:modelValue` | ダイアログ開閉 |

---

#### ConfirmDialog.vue

OK / キャンセルの確認用ダイアログ。BaseDialog を使用。

**Props:**
| name | type | required | 説明 |
|---|---|---|---|
| `modelValue` | `boolean` | ✓ | v-model |
| `title` | `string` | ✓ | タイトル |
| `message` | `string` | ✓ | 確認メッセージ本文 |

**Emits:**
| name | 説明 |
|---|---|
| `confirm` | OK ボタン押下 |
| `cancel` | キャンセル押下 |

---

#### ProductDialog.vue（既存を移行）

商品クイックビューダイアログ。既存実装を BaseDialog ベースに移行する。

**Props:**
| name | type | required | 説明 |
|---|---|---|---|
| `modelValue` | `boolean` | ✓ | v-model |
| `product` | `Product \| null` | ✓ | 表示する商品データ |

**Emits:**
| name | 説明 |
|---|---|
| `detail` | 詳細ページへ遷移 |

---

## ルーター構成

```ts
// router/index.ts
const routes = [
  // MainLayout タブ（BottomNav に対応）
  { path: '/',           component: HomePage      },
  { path: '/search',     component: SearchPage    },
  { path: '/favorites',  component: FavoritePage  },
  { path: '/settings',   component: SettingsPage  },
  // SubLayout スタック遷移
  { path: '/detail/:id', component: DetailPage, props: true },
]
```

---

## ファイル変更一覧

| 操作 | ファイル | 備考 |
|---|---|---|
| 削除 | `src/components/layout/AppHeader.vue` | MainLayout / SubLayout に統合 |
| 削除 | `src/components/layout/AppFooter.vue` | MainLayout に統合 |
| 新規 | `src/components/layout/MainLayout.vue` | AppBar + slot + BottomNav |
| 新規 | `src/components/layout/SubLayout.vue` | AppBar（戻る）+ slot |
| 新規 | `src/components/dialog/BaseDialog.vue` | 汎用ダイアログ基盤 |
| 新規 | `src/components/dialog/ConfirmDialog.vue` | 確認ダイアログ |
| 変更 | `src/components/product/ProductDialog.vue` | BaseDialog を使うよう移行 |
| リネーム | `src/pages/MenuPage.vue` → `src/pages/HomePage.vue` | MainLayout を使用。ルートに合わせてリネーム |
| 変更 | `src/pages/SearchPage.vue` | MainLayout を使用 |
| 変更 | `src/pages/DetailPage.vue` | SubLayout を使用 |
| 新規 | `src/pages/FavoritePage.vue` | MainLayout 使用のプレースホルダー |
| 新規 | `src/pages/SettingsPage.vue` | MainLayout 使用のプレースホルダー |
| 変更 | `src/router/index.ts` | 4タブ分のルート追加 |
| 変更 | `src/App.vue` | `<router-view />` のみに簡略化 |
