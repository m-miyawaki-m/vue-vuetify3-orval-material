# Vuetify 3 Android向け画面設計ガイド

> 自分用チートシート。Vuetify 3 + Capacitor（Android）で画面を作るときの思考プロセスと実装パターン集。

---

## 目次

1. [画面設計の思考フロー](#1-画面設計の思考フロー)
2. [コンポーネント × Android適合度表](#2-コンポーネント--android適合度表)
3. [メニュー画面パターン](#3-メニュー画面パターン)
4. [検索・一覧画面パターン](#4-検索一覧画面パターン)
5. [詳細画面パターン](#5-詳細画面パターン)
6. [共通コンポーネントの作り方](#6-共通コンポーネントの作り方)

---

## 1. 画面設計の思考フロー

画面を作り始めるときは以下の順番で考える。

### ステップ1: レイアウト骨格を決める

すべての画面の起点は `v-layout`。`v-main` がメインスクロール領域、`v-container` でコンテンツ幅を制御する。

```vue
<template>
  <v-layout>
    <AppHeader title="タイトル" />   <!-- v-app-bar -->
    <v-main>
      <v-container class="py-4">
        <!-- コンテンツ -->
      </v-container>
    </v-main>
    <AppFooter />                    <!-- v-bottom-navigation -->
  </v-layout>
</template>
```

### ステップ2: ナビゲーション方式を決める

| パターン | Vuetifyコンポーネント | 用途 |
|---------|---------------------|------|
| トップバー（戻るボタンあり） | `v-app-bar` + `showBack` prop | 階層下位の画面 |
| トップバー（固定） | `v-app-bar` | トップ/メニュー画面 |
| ボトムナビ | `v-bottom-navigation` | タブ切り替えのルート画面 |
| サイドドロワー | `v-navigation-drawer` | 設定・管理画面（Android向けには非推奨） |

### ステップ3: コンテンツ構造を決める

- **カードグリッド** → メニュー・ギャラリー系
- **リスト** → `v-list`（シンプルな一覧）または ProductCard繰り返し（リッチな一覧）
- **タブ切り替え** → `v-tabs` + `v-window`（詳細画面のコンテンツ分割）

### ステップ4: インタラクションを決める

| 操作 | コンポーネント |
|------|-------------|
| 一時的な詳細表示 | `v-dialog` |
| 折り畳みフィルター | `v-expansion-panels` |
| 通知・フィードバック | `v-snackbar` |

### ステップ5: フィードバック・状態表示を決める

- 空状態 → `v-alert type="info"`
- エラー状態 → `v-alert type="error"`
- ローディング → `v-progress-circular`
- バッジ・ラベル → `v-chip`

### Android固有の注意点

- **タッチターゲット:** Vuetifyのデフォルトボタン・リストアイテムは48dp相当を満たす
- **セーフエリア:** Capacitorで実機表示時、ステータスバー下が隠れる場合は `padding-top: env(safe-area-inset-top)` を `v-app-bar` に適用
- **スクロール競合:** `v-main` 内での横スクロールは競合しやすい。`v-tabs` のスワイプはデフォルト無効なので注意

---

## 2. コンポーネント × Android適合度表

| 記号 | 意味 |
|------|------|
| ◎ | そのまま使える。Androidネイティブに近い挙動 |
| ○ | 使えるが軽い設定が必要 |
| △ | 使えるが注意点あり（パフォーマンス・UX） |
| × | モバイルには不向き。代替を検討 |

### レイアウト系

| コンポーネント | 適合度 | 備考 |
|-------------|--------|------|
| `v-layout` | ◎ | すべての画面の起点。必須 |
| `v-main` | ◎ | メインスクロール領域。`v-app-bar` と自動的に高さ調整される |
| `v-container` | ◎ | `fluid` prop でフル幅にできる |
| `v-row` / `v-col` | ◎ | `cols="12" sm="6"` でスマホ1列・タブレット2列 |

### ナビゲーション系

| コンポーネント | 適合度 | 備考 |
|-------------|--------|------|
| `v-app-bar` | ◎ | Androidのトップバーに相当。`elevation` で影を制御 |
| `v-bottom-navigation` | ◎ | Androidのボトムナビに相当。ルートタブ切り替えに最適 |
| `v-navigation-drawer` | △ | ハンバーガーメニュー。Androidでは非推奨UXになりつつある |
| `v-tabs`（画面上部） | ○ | タブ切り替えはAndroid的だが、スワイプ操作は自動では機能しない |

### コンテンツ系

| コンポーネント | 適合度 | 備考 |
|-------------|--------|------|
| `v-card` | ◎ | Material Design の基本単位。タップ領域の確保に最適 |
| `v-list` / `v-list-item` | ◎ | シンプルな一覧表示に最適 |
| `v-chip` | ◎ | ステータス・タグ表示に使いやすい |
| `v-rating` | ○ | `readonly` + `density="compact"` で一覧に組み込める |
| `v-avatar` | ◎ | ユーザー・商品アイコンに |

### 入力系

| コンポーネント | 適合度 | 備考 |
|-------------|--------|------|
| `v-text-field` | ◎ | `variant="outlined"` が見やすい。`clearable` で×ボタン付与 |
| `v-select` | ○ | モバイルではネイティブ select より操作しにくい場合がある |
| `v-radio-group` | ○ | `inline` でコンパクトに。選択肢は4つ以内が望ましい |
| `v-switch` | ◎ | ON/OFFトグルに最適 |
| `v-checkbox` | ○ | タッチ領域が小さめ。`density="comfortable"` を推奨 |
| `v-slider` | △ | タッチ操作でのスライドが意図しない値になることがある |

### フィードバック系

| コンポーネント | 適合度 | 備考 |
|-------------|--------|------|
| `v-dialog` | ○ | `max-width="500"` で適切なサイズに制限する |
| `v-bottom-sheet` | ◎ | Androidのボトムシートに相当。dialogより自然 |
| `v-snackbar` | ◎ | 操作完了の通知に。`timeout` で自動消去 |
| `v-alert` | ◎ | 空状態・エラー表示に。`variant="tonal"` が見やすい |
| `v-progress-circular` | ◎ | ローディング表示の標準 |
| `v-progress-linear` | ◎ | 画面上部のローディングバーに |

### データ表示系

| コンポーネント | 適合度 | 備考 |
|-------------|--------|------|
| `v-expansion-panels` | ◎ | 折り畳みフィルター・FAQ・レビュー表示に最適 |
| `v-window` / `v-window-item` | ◎ | タブコンテンツの切り替えに使う |
| `v-pagination` | △ | タップ領域が小さい。件数が多い場合は無限スクロールを検討 |
| `v-data-table` | × | 横幅が広すぎてスマホ画面に収まらない。`v-list` か独自カードで代替 |
| `v-carousel` | △ | 画像スライダー。パフォーマンスに注意 |
| `v-timeline` | △ | 縦幅を消費しすぎる。用途を限定して使う |

---

## 3. メニュー画面パターン

**参照コード:** `src/pages/MenuPage.vue`

### なぜこの構成か

カードグリッドはAndroidのランチャー（アプリ一覧）的なUXに近い。`v-row` + `v-col` のレスポンシブグリッドを使うことで、スマホでは1列（`cols="12"`）、タブレットでは2〜3列（`sm="6" md="4"`）を設定1行で実現できる。

### 実装コード

```vue
<template>
  <v-layout>
    <AppHeader title="メニュー" />
    <v-main>
      <v-container class="py-6">
        <v-row>
          <v-col
            v-for="item in menuItems"
            :key="item.title"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              :disabled="!item.to"
              @click="item.to ? router.push(item.to) : undefined"
            >
              <v-card-title>
                <v-icon class="mr-2">{{ item.icon }}</v-icon>
                {{ item.title }}
              </v-card-title>
              <v-card-text>{{ item.description }}</v-card-text>
              <v-card-actions>
                <v-btn
                  :color="item.to ? 'primary' : undefined"
                  variant="text"
                  :disabled="!item.to"
                >
                  {{ item.to ? '開く' : '準備中' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <AppFooter />
  </v-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const router = useRouter()

const menuItems = [
  { title: '商品を探す', icon: 'mdi-magnify', description: '商品の検索・絞り込みができます', to: '/search' },
  { title: 'お気に入り', icon: 'mdi-heart', description: 'お気に入り商品の一覧', to: null },
]
</script>
```

### Android注意点

- カード全体をタップ可能にするために `v-card` の `@click` で遷移する（`v-btn` だけではタップ領域が狭い）
- `disabled` 状態のカードは視覚的にグレーアウトされる。「準備中」の項目はユーザーへの期待値調整になる
- `v-card-actions` 内の `v-btn` には `@click.stop` は不要（カード全体クリックと競合しないため）

---

## 4. 検索・一覧画面パターン

**参照コード:** `src/pages/SearchPage.vue`, `src/components/product/ProductCard.vue`

### なぜこの構成か

キーワード検索バーを常時表示し、詳細フィルターは `v-expansion-panels` で折り畳む。検索条件を使わないユーザーには一覧だけが見え、絞り込みたいユーザーは展開して使える。Androidの「詳細検索」UXパターンに合致している。

### 実装コード

#### 検索フィールド

```vue
<v-text-field
  v-model="store.keyword"
  label="キーワード検索"
  prepend-inner-icon="mdi-magnify"
  clearable
  variant="outlined"
  class="mt-4"
  @update:model-value="store.resetPage()"
/>
```

#### アコーディオンフィルター

```vue
<v-expansion-panels class="mb-4">
  <v-expansion-panel>
    <v-expansion-panel-title>詳細検索</v-expansion-panel-title>
    <v-expansion-panel-text>
      <v-radio-group
        v-model="store.selectedCategory"
        inline
        class="mb-3"
        @update:model-value="store.resetPage()"
      >
        <v-radio label="すべて" value="" />
        <v-radio v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
      </v-radio-group>
      <v-switch
        v-model="store.inStockOnly"
        label="在庫ありのみ表示"
        color="primary"
        hide-details
        @update:model-value="store.resetPage()"
      />
    </v-expansion-panel-text>
  </v-expansion-panel>
</v-expansion-panels>
```

#### 一覧 + 空状態 + ページネーション

```vue
<template v-if="store.pagedProducts.length > 0">
  <ProductCard
    v-for="product in store.pagedProducts"
    :key="product.id"
    :product="product"
    @click="openDialog(product)"
    @detail="goDetail(product)"
  />
</template>
<v-alert v-else type="info" variant="tonal">
  条件に一致する商品が見つかりませんでした。
</v-alert>

<v-pagination
  v-if="store.totalPages > 1"
  v-model="store.currentPage"
  :length="store.totalPages"
  class="mt-4"
/>
```

#### ProductCard コンポーネント

```vue
<template>
  <v-card class="mb-3" @click="emit('click', product)">
    <v-card-title class="text-body-1 font-weight-bold">{{ product.name }}</v-card-title>
    <v-card-subtitle>{{ product.category }}</v-card-subtitle>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-2">
        <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
        <v-chip :color="product.inStock ? 'success' : 'error'" size="small" variant="tonal">
          {{ product.inStock ? '在庫あり' : '在庫なし' }}
        </v-chip>
      </div>
      <v-rating
        :model-value="product.rating"
        density="compact"
        readonly
        size="small"
        color="amber"
        class="mb-1"
      />
      <p class="text-body-2 text-medium-emphasis">{{ product.description }}</p>
    </v-card-text>
    <v-card-actions>
      <v-btn variant="text" color="primary" @click.stop="emit('detail', product)">
        詳細を見る
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'
defineProps<{ product: Product }>()
const emit = defineEmits<{
  click: [product: Product]
  detail: [product: Product]
}>()
</script>
```

### Android注意点

- `v-pagination` はタップ領域が小さい。件数が数百件以上になる場合は無限スクロール（Intersection Observer）への切り替えを検討
- フィルター変更時に必ず `resetPage()` を呼ぶ。2ページ目を表示中にフィルターが変わると表示がずれる
- `v-switch` は `hide-details` を付けると下の余白が消えてコンパクトになる

---

## 5. 詳細画面パターン

**参照コード:** `src/pages/DetailPage.vue`

### なぜこの構成か

詳細画面はコンテンツ量が多い。`v-tabs` + `v-window` でコンテンツをカテゴリ別に分割することで、Androidのタブ切り替えUXを実現しつつ1画面に詰め込みすぎることを防ぐ。

### 実装コード

#### タブ切り替え骨格

```vue
<v-tabs v-model="tab" class="mb-4" color="primary">
  <v-tab value="info">商品情報</v-tab>
  <v-tab value="reviews">レビュー</v-tab>
  <v-tab value="related">関連商品</v-tab>
</v-tabs>

<v-window v-model="tab">
  <v-window-item value="info">
    <!-- 商品情報 -->
  </v-window-item>
  <v-window-item value="reviews">
    <!-- レビュー -->
  </v-window-item>
  <v-window-item value="related">
    <!-- 関連商品 -->
  </v-window-item>
</v-window>
```

#### 商品情報タブ（CTAボタン付きカード）

```vue
<v-card>
  <v-card-title>{{ product.name }}</v-card-title>
  <v-card-subtitle>{{ product.category }}</v-card-subtitle>
  <v-card-text>
    <p class="text-h5 mb-2">¥{{ product.price.toLocaleString() }}</p>
    <v-chip :color="product.inStock ? 'success' : 'error'" variant="tonal" class="mb-3">
      {{ product.inStock ? '在庫あり' : '在庫なし' }}
    </v-chip>
    <v-rating :model-value="product.rating" readonly color="amber" class="mb-3" />
    <p class="text-body-1">{{ product.description }}</p>
  </v-card-text>
  <v-card-actions>
    <v-btn
      color="primary"
      variant="elevated"
      size="large"
      :disabled="!product.inStock"
      prepend-icon="mdi-cart"
    >
      カートに追加
    </v-btn>
  </v-card-actions>
</v-card>
```

#### レビュータブ（フィルター + アコーディオン）

```vue
<v-radio-group v-model="reviewFilter" label="評価で絞り込み" inline class="mb-3">
  <v-radio label="すべて" :value="0" />
  <v-radio v-for="n in 5" :key="n" :label="`${n}★`" :value="n" />
</v-radio-group>

<v-expansion-panels v-if="filteredReviews.length > 0">
  <v-expansion-panel v-for="review in filteredReviews" :key="review.id">
    <v-expansion-panel-title>
      {{ review.author }}
      <v-rating
        :model-value="review.rating"
        readonly
        density="compact"
        size="small"
        color="amber"
        class="ml-2"
      />
    </v-expansion-panel-title>
    <v-expansion-panel-text>{{ review.comment }}</v-expansion-panel-text>
  </v-expansion-panel>
</v-expansion-panels>
<v-alert v-else type="info" variant="tonal">該当するレビューがありません。</v-alert>
```

#### script setup

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import type { Product } from '@/types/product'

const props = defineProps<{ id: string }>()
const store = useProductStore()
const router = useRouter()
const tab = ref('info')
const reviewFilter = ref(0)

const product = computed(() =>
  store.products.find(p => p.id === Number(props.id)) ?? null
)

const filteredReviews = computed(() => {
  if (!product.value) return []
  if (reviewFilter.value === 0) return product.value.reviews
  return product.value.reviews.filter(r => r.rating === reviewFilter.value)
})
</script>
```

### Android注意点

- `v-tabs` はデフォルトでスワイプ対応しない。Capacitorでスワイプナビゲーションが必要な場合は `touch` イベントを `v-window` に追加実装が必要
- `v-card-actions` の `v-btn` に `size="large"` + `variant="elevated"` を組み合わせるとCTAとして目立つ
- 商品が見つからない場合は `v-if="product"` で分岐し `v-alert type="error"` を表示する

---

## 6. 共通コンポーネントの作り方

### 設計ルール

1. **コンポーネントは「表示」か「アクション委譲」のどちらかに責務を絞る**
2. **Pinia storeへの直接アクセスはPage層のみ。** コンポーネントはprops/emitsのみで動く
3. **`defineProps<T>()` + `defineEmits<{...}>()`** で型安全を確保する

### 6-1: AppHeader（ナビゲーションバー）

**設計方針:** `v-app-bar` を薄くラップ。propsは `title` と `showBack` のみ。back遷移ロジックを内包することで、呼び出し元に `router.back()` を書かせない。

```vue
<template>
  <v-app-bar color="primary" elevation="2">
    <template v-if="showBack" #prepend>
      <v-btn icon @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>
    <v-app-bar-title>{{ title }}</v-app-bar-title>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

withDefaults(defineProps<{
  title: string
  showBack?: boolean
}>(), { showBack: false })

const router = useRouter()
</script>
```

**使い方:**

```vue
<AppHeader title="商品検索" :show-back="true" />
```

---

### 6-2: ProductCard（再利用カードコンポーネント）

**設計方針:** 表示データは props で受け取り、アクション（クリック・詳細へ）は emits で親に委譲。カード内部にロジックを持たせない。`@click.stop` で親の `@click` と子の `@click` が競合しないようにする。

```vue
<template>
  <v-card class="mb-3" @click="emit('click', product)">
    <v-card-title class="text-body-1 font-weight-bold">{{ product.name }}</v-card-title>
    <v-card-subtitle>{{ product.category }}</v-card-subtitle>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-2">
        <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
        <v-chip :color="product.inStock ? 'success' : 'error'" size="small" variant="tonal">
          {{ product.inStock ? '在庫あり' : '在庫なし' }}
        </v-chip>
      </div>
      <v-rating
        :model-value="product.rating"
        density="compact"
        readonly
        size="small"
        color="amber"
        class="mb-1"
      />
      <p class="text-body-2 text-medium-emphasis">{{ product.description }}</p>
    </v-card-text>
    <v-card-actions>
      <v-btn variant="text" color="primary" @click.stop="emit('detail', product)">
        詳細を見る
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'
defineProps<{ product: Product }>()
const emit = defineEmits<{
  click: [product: Product]
  detail: [product: Product]
}>()
</script>
```

**使い方:**

```vue
<ProductCard
  :product="item"
  @click="openDialog(item)"
  @detail="goDetail(item)"
/>
```

---

### 6-3: ProductDialog（モーダル）

**設計方針:** `defineModel<boolean>()` で `v-model` に対応。表示/非表示の状態を親が持つ。コンポーネント内から `emit('detail')` で詳細ページへの遷移を親に委譲する。

```vue
<template>
  <v-dialog v-model="model" max-width="500">
    <v-card v-if="product">
      <v-card-title>{{ product.name }}</v-card-title>
      <v-card-subtitle>{{ product.category }}</v-card-subtitle>
      <v-card-text>
        <div class="d-flex align-center ga-2 mb-3">
          <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
          <v-chip :color="product.inStock ? 'success' : 'error'" variant="tonal">
            {{ product.inStock ? '在庫あり' : '在庫なし' }}
          </v-chip>
        </div>
        <v-rating :model-value="product.rating" readonly color="amber" class="mb-3" />
        <p>{{ product.description }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">閉じる</v-btn>
        <v-btn color="primary" variant="elevated" @click="onDetail">詳細を見る</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'
const model = defineModel<boolean>()
const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{ detail: [product: Product] }>()

function onDetail() {
  if (props.product) emit('detail', props.product)
}
</script>
```

**使い方:**

```vue
<ProductDialog
  v-model="dialogOpen"
  :product="selectedProduct"
  @detail="goDetail"
/>
```
