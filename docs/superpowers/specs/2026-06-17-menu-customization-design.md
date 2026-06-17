# メニューカスタマイズ 設計書

**作成日**: 2026-06-17  
**対象プロジェクト**: vue-vuetify3-orval-material (Vue 3 + Vuetify 4 + Capacitor 7)

---

## 概要

ホーム画面のメニューを 3×3 アイコングリッドに変更し、設定画面から表示項目と並び順をカスタマイズできるようにする。

---

## 要件

- ホーム画面にアイコングリッド（最大 9 枠）を表示する
- 設定画面でメニュー項目の「表示/非表示」と「並び順」を変更できる
- 設定はアプリ内（localStorage）に保存され、再起動後も維持される
- マスターデータ（全メニュー項目）はコードで定義する（将来 API 化可能な構造にする）

---

## 画面仕様

### ホーム画面

- 3 列 × 3 行のアイコングリッド（最大 9 枠）
- 各セルにアイコン（mdi）＋ラベルを表示
- 表示中が 9 未満のとき、空き枠は破線の空セルとして表示
- タップで対応ルートへ遷移

### 設定画面（既存ページにセクション追加）

**上部ミニプレビュー**
- 設定画面の上部に 9 マスのミニプレビューを表示
- 現在の「表示中」の状態をリアルタイムで反映

**「表示中」セクション**
- 表示中のメニュー項目を縦リストで表示（順番 = ホーム画面の並び順）
- 各行の右端に `≡` ドラッグハンドル → 上下ドラッグで並び替え（vuedraggable）
- 各行の右に `×` ボタン → タップで非表示に移動
- 件数表示: `表示中（N/9）`

**「非表示」セクション**
- 非表示のメニュー項目を縦リストで表示
- 各行に `＋追加` ボタン → タップで表示中の末尾に追加
- 表示中が 9 件のとき `＋追加` は無効化（ツールチップ「最大 9 個」を表示）

---

## データ設計

### マスターデータ（コード定義）

```ts
// src/stores/menuStore.ts
export interface MenuItem {
  id: string       // 一意キー（例: 'search', 'inventory'）
  label: string    // 表示名
  icon: string     // mdi アイコン名（例: 'mdi-magnify'）
  to: string       // 遷移先パス
}

export const MENU_MASTER: MenuItem[] = [
  { id: 'search',    label: '商品を探す',       icon: 'mdi-magnify',          to: '/search'    },
  { id: 'favorites', label: 'お気に入り',        icon: 'mdi-heart',            to: '/favorites' },
  { id: 'settings',  label: '設定',             icon: 'mdi-cog',              to: '/settings'  },
  { id: 'samples',   label: 'コンポーネント',    icon: 'mdi-palette-swatch',   to: '/samples'   },
  { id: 'scanner',   label: 'スキャナー',        icon: 'mdi-barcode-scan',     to: '/scanner'   },
  // 追加メニュー項目をここに定義
]
```

### Pinia ストア（永続化）

```ts
// src/stores/menuStore.ts
interface MenuState {
  visibleIds: string[]  // 表示中の id リスト（順番 = 並び順、最大 9 件）
}

// 初期値: 全項目を表示中（MENU_MASTER の順）
// 保存先: localStorage（pinia-plugin-persistedstate）
```

**派生データ（computed）**

```ts
visibleItems  // visibleIds の順に MENU_MASTER から引いた MenuItem[]
hiddenItems   // MENU_MASTER から visibleIds に含まれないもの
canAddMore    // visibleIds.length < 9
```

---

## コンポーネント構成

```
src/
├── stores/
│   └── menuStore.ts              # 新規：メニュー設定ストア
├── components/
│   └── menu/
│       ├── MenuGrid.vue          # 新規：3×3 グリッド表示
│       ├── MenuGridItem.vue      # 新規：グリッド1セル（アイコン＋ラベル）
│       └── MenuSettingsPanel.vue # 新規：設定画面のカスタマイズUI
└── pages/
    ├── HomePage.vue              # 変更：MenuGrid を使う形に書き換え
    └── SettingsPage.vue          # 変更：MenuSettingsPanel セクションを追加
```

---

## 依存パッケージ

| パッケージ | 用途 | インストール |
|---|---|---|
| `vuedraggable@next` | ドラッグ＆ドロップ（SortableJS ラッパー） | `npm install vuedraggable@next` |
| `pinia-plugin-persistedstate` | Pinia ストアの localStorage 永続化 | `npm install pinia-plugin-persistedstate` |

---

## 実装の境界

**スコープ内**
- ホーム画面の 3×3 グリッド表示
- 設定画面での並び替え・表示切替
- localStorage への永続化

**スコープ外**
- マスターデータの API 取得（将来対応、構造は準備済み）
- ユーザーごとのサーバー保存
- アイコン色のカスタマイズ

---

## 変更ファイル一覧

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/stores/menuStore.ts` | 新規 | メニュー設定ストア |
| `src/components/menu/MenuGrid.vue` | 新規 | 3×3 グリッド |
| `src/components/menu/MenuGridItem.vue` | 新規 | グリッド1セル |
| `src/components/menu/MenuSettingsPanel.vue` | 新規 | 設定UI（draggable + 追加/削除） |
| `src/pages/HomePage.vue` | 変更 | MenuGrid に切り替え |
| `src/pages/SettingsPage.vue` | 変更 | MenuSettingsPanel セクション追加 |
| `src/plugins/index.ts` | 変更 | pinia-plugin-persistedstate を登録 |
