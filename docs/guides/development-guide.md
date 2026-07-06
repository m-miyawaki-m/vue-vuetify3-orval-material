# 開発ガイド — 部品の追加とカスタマイズ

## 目次

1. [PCブラウザでのスマホ表示固定](#pcブラウザでのスマホ表示固定)
2. [新しいページの追加](#新しいページの追加)
3. [BottomNav タブの追加](#bottomnav-タブの追加)
4. [ダイアログの追加](#ダイアログの追加)
5. [レイアウトのカスタマイズ](#レイアウトのカスタマイズ)

---

## PCブラウザでのスマホ表示固定

`src/App.vue` の CSS で `max-width: 430px` に固定済みです。

- **スマホ実機・Android Studio**: 全幅表示（変化なし）
- **PC ブラウザ（480px以上）**: 430px 幅にセンタリング、グレー背景でスマホ枠として表示

幅を変えたい場合は `App.vue` の以下の値を編集します：

```css
/* src/App.vue */
.phone-wrapper {
  max-width: 430px;   /* ← ここを変える（例: 390px = iPhone サイズ）*/
}
.phone-app {
  max-width: 430px !important;  /* ← phone-wrapper と同じ値にする */
}
```

**ブレークポイントの目安：**
| 値 | 用途 |
|---|---|
| `390px` | iPhone 14 相当 |
| `412px` | Pixel 7 相当 |
| `430px` | iPhone 14 Pro Max / 一般的な Android 幅 |

---

## 新しいページの追加

### Step 1: ページファイルを作成する

`src/pages/` に Vue ファイルを作成します。タブ画面なら `MainLayout`、詳細画面なら `SubLayout` を使います。

**タブ画面（例: CartPage.vue）:**
```vue
<template>
  <MainLayout title="カート">
    <v-container class="py-6">
      <!-- ページ内容 -->
    </v-container>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
</script>
```

**詳細・スタック画面（例: OrderDetailPage.vue）:**
```vue
<template>
  <SubLayout title="注文詳細">
    <v-container class="pb-6">
      <!-- ページ内容 -->
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import SubLayout from '@/components/layout/SubLayout.vue'
</script>
```

### Step 2: ルートを追加する

`src/router/index.ts` に追記します：

```ts
import CartPage from '@/pages/CartPage.vue'
import OrderDetailPage from '@/pages/OrderDetailPage.vue'

const routes = [
  // ... 既存のルート
  { path: '/cart',           component: CartPage        },
  { path: '/order/:id',      component: OrderDetailPage, props: true },
]
```

### Step 3: BottomNav に追加する（任意）

タブにも表示したい場合は後述の「BottomNav タブの追加」を参照。

---

## BottomNav タブの追加

`src/components/layout/MainLayout.vue` の `tabs` 配列を編集します：

```ts
// src/components/layout/MainLayout.vue
const tabs = [
  { icon: 'mdi-home',    label: 'ホーム',       to: '/'          },
  { icon: 'mdi-magnify', label: '検索',         to: '/search'    },
  { icon: 'mdi-cart',    label: 'カート',       to: '/cart'      },  // ← 追加
  { icon: 'mdi-heart',   label: 'お気に入り',   to: '/favorites' },
  { icon: 'mdi-cog',     label: '設定',         to: '/settings'  },
]
```

**注意点:**
- `v-bottom-navigation` は **5タブまで**が推奨（Android Material Design ガイドライン）
- アイコン名は [MDI アイコン一覧](https://pictogrammers.com/library/mdi/) から選ぶ
- `to` はルーターのパスと一致させる

---

## ダイアログの追加

### パターン A: BaseDialog を直接使う（シンプル）

```vue
<template>
  <v-btn @click="open = true">開く</v-btn>

  <BaseDialog v-model="open" title="タイトル">
    <p>本文テキスト</p>
    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="open = false">閉じる</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseDialog from '@/components/dialog/BaseDialog.vue'

const open = ref(false)
</script>
```

### パターン B: 専用ダイアログコンポーネントを作る（再利用する場合）

`src/components/dialog/` に作成します：

```vue
<!-- src/components/dialog/AddToCartDialog.vue -->
<template>
  <BaseDialog v-model="model" title="カートに追加">
    <p>{{ productName }} をカートに追加しますか？</p>
    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="model = false">キャンセル</v-btn>
      <v-btn color="primary" variant="elevated" @click="onConfirm">追加</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'

defineProps<{ productName: string }>()
const model = defineModel<boolean>()
const emit = defineEmits<{ confirm: [] }>()

function onConfirm() {
  emit('confirm')
  model.value = false
}
</script>
```

**使い方：**
```vue
<AddToCartDialog
  v-model="dialogOpen"
  :product-name="product.name"
  @confirm="addToCart"
/>
```

### パターン C: ConfirmDialog を使う（確認用途）

```vue
<template>
  <v-btn color="error" @click="confirmOpen = true">削除</v-btn>

  <ConfirmDialog
    v-model="confirmOpen"
    title="削除の確認"
    message="この商品をお気に入りから削除しますか？"
    @confirm="onDelete"
    @cancel="confirmOpen = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from '@/components/dialog/ConfirmDialog.vue'

const confirmOpen = ref(false)

function onDelete() {
  confirmOpen.value = false
  // 削除処理
}
</script>
```

---

## レイアウトのカスタマイズ

### AppBar にアイコンボタンを追加する（MainLayout の actions スロット）

```vue
<template>
  <MainLayout title="検索">
    <template #actions>
      <v-btn icon="mdi-filter" @click="filterOpen = true" />
      <v-btn icon="mdi-dots-vertical" />
    </template>

    <!-- ページ内容 -->
  </MainLayout>
</template>
```

### AppBar のタイトルを動的にする

```vue
<MainLayout :title="pageTitle">
  ...
</MainLayout>

<script setup lang="ts">
import { computed } from 'vue'
const pageTitle = computed(() => `検索結果 (${count.value}件)`)
</script>
```

### BottomNav を一時的に非表示にしたい

`MainLayout.vue` に `hideNav` prop を追加する方法：

```vue
<!-- MainLayout.vue に追加 -->
<script setup lang="ts">
const props = defineProps<{
  title: string
  hideNav?: boolean
}>()
</script>

<!-- template 内 -->
<v-bottom-navigation v-if="!props.hideNav" v-model="activeTab" color="primary">
```

使い方：
```vue
<MainLayout title="フルスクリーン表示" :hide-nav="true">
```

---

## ファイル構成の参考

```
src/
  components/
    layout/
      MainLayout.vue    ← タブ画面用（AppBar + BottomNav）
      SubLayout.vue     ← 詳細画面用（AppBar 戻るボタンのみ）
    dialog/
      BaseDialog.vue    ← 全ダイアログの基盤
      ConfirmDialog.vue ← OK/キャンセル確認
      [任意].vue        ← 独自ダイアログはここに追加
    product/
      ProductCard.vue
      ProductDialog.vue
  pages/
    HomePage.vue        ← / (BottomNav: ホーム)
    SearchPage.vue      ← /search (BottomNav: 検索)
    FavoritePage.vue    ← /favorites (BottomNav: お気に入り)
    SettingsPage.vue    ← /settings (BottomNav: 設定)
    DetailPage.vue      ← /detail/:id (SubLayout)
    [任意]Page.vue      ← 新規ページはここに追加
  router/
    index.ts            ← ルート一覧
```
