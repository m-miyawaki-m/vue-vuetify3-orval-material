# Android レイアウト再設計 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MainLayout（BottomNav付き）とSubLayout（戻るボタン付き）の2種レイアウト、および BaseDialog 基盤を導入し、全画面をレイアウトテンプレートで統一する。

**Architecture:** MainLayout は4タブのBottomNavを内包し、タブ画面（ホーム・検索・お気に入り・設定）が使用する。SubLayout はBottomNavを持たず戻るボタン付きAppBarのみで、DetailPage などスタック遷移画面が使用する。ダイアログは BaseDialog を基盤とした階層構造にする。

**Tech Stack:** Vue 3 (Composition API + `<script setup>`), Vuetify 4, Vue Router 5, TypeScript

---

## ファイル構成

| 操作 | パス | 役割 |
|---|---|---|
| 新規 | `src/components/layout/MainLayout.vue` | AppBar + slot + BottomNav 4タブ |
| 新規 | `src/components/layout/SubLayout.vue` | AppBar（戻る）+ slot |
| 新規 | `src/components/dialog/BaseDialog.vue` | 汎用ダイアログ基盤 |
| 新規 | `src/components/dialog/ConfirmDialog.vue` | OK/キャンセル確認ダイアログ |
| 変更 | `src/components/product/ProductDialog.vue` | BaseDialog を使うよう移行 |
| リネーム+変更 | `src/pages/MenuPage.vue` → `src/pages/HomePage.vue` | MainLayout 使用 |
| 新規 | `src/pages/FavoritePage.vue` | MainLayout 使用のプレースホルダー |
| 新規 | `src/pages/SettingsPage.vue` | MainLayout 使用のプレースホルダー |
| 変更 | `src/pages/SearchPage.vue` | MainLayout 使用に変更 |
| 変更 | `src/pages/DetailPage.vue` | SubLayout 使用に変更 |
| 変更 | `src/router/index.ts` | 4タブ分ルート追加 |
| 変更 | `src/App.vue` | `<router-view />` のみに簡略化 |
| 削除 | `src/components/layout/AppHeader.vue` | MainLayout/SubLayout に統合済み |
| 削除 | `src/components/layout/AppFooter.vue` | MainLayout に統合済み |

---

## Task 1: BaseDialog.vue を作成する

**Files:**
- Create: `src/components/dialog/BaseDialog.vue`

- [ ] **Step 1: ファイルを作成する**

`src/components/dialog/BaseDialog.vue` を以下の内容で作成する：

```vue
<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <v-card-actions v-if="$slots.actions">
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  title: string
  maxWidth?: string
}>(), {
  maxWidth: '500px',
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

エラーがないことを確認する。

- [ ] **Step 3: コミット**

```bash
git add src/components/dialog/BaseDialog.vue
git commit -m "feat: add BaseDialog component"
```

---

## Task 2: ConfirmDialog.vue を作成する

**Files:**
- Create: `src/components/dialog/ConfirmDialog.vue`

- [ ] **Step 1: ファイルを作成する**

`src/components/dialog/ConfirmDialog.vue` を以下の内容で作成する：

```vue
<template>
  <BaseDialog
    :model-value="modelValue"
    :title="title"
    max-width="400px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p>{{ message }}</p>
    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="$emit('cancel')">キャンセル</v-btn>
      <v-btn color="primary" variant="elevated" @click="$emit('confirm')">OK</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'

defineProps<{
  modelValue: boolean
  title: string
  message: string
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()
</script>
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 3: コミット**

```bash
git add src/components/dialog/ConfirmDialog.vue
git commit -m "feat: add ConfirmDialog component"
```

---

## Task 3: ProductDialog.vue を BaseDialog ベースに移行する

**Files:**
- Modify: `src/components/product/ProductDialog.vue`

- [ ] **Step 1: ProductDialog.vue を書き換える**

```vue
<template>
  <BaseDialog
    :model-value="model ?? false"
    :title="product?.name ?? ''"
    @update:model-value="model = $event"
  >
    <template v-if="product">
      <p class="text-caption text-medium-emphasis mb-2">{{ product.category }}</p>
      <div class="d-flex align-center ga-2 mb-3">
        <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
        <v-chip :color="product.inStock ? 'success' : 'error'" variant="tonal">
          {{ product.inStock ? '在庫あり' : '在庫なし' }}
        </v-chip>
      </div>
      <v-rating :model-value="product.rating" readonly color="amber" class="mb-3" />
      <p>{{ product.description }}</p>
    </template>
    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="model = false">閉じる</v-btn>
      <v-btn color="primary" variant="elevated" @click="onDetail">詳細を見る</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'
import BaseDialog from '@/components/dialog/BaseDialog.vue'

const model = defineModel<boolean>()
const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{ detail: [product: Product] }>()

function onDetail() {
  if (props.product) emit('detail', props.product)
}
</script>
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 3: コミット**

```bash
git add src/components/product/ProductDialog.vue
git commit -m "refactor: migrate ProductDialog to use BaseDialog"
```

---

## Task 4: MainLayout.vue を作成する

**Files:**
- Create: `src/components/layout/MainLayout.vue`

- [ ] **Step 1: ファイルを作成する**

```vue
<template>
  <v-layout>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>{{ title }}</v-app-bar-title>
      <template v-if="$slots.actions" #append>
        <slot name="actions" />
      </template>
    </v-app-bar>
    <v-main>
      <slot />
    </v-main>
    <v-bottom-navigation v-model="activeTab" color="primary">
      <v-btn v-for="tab in tabs" :key="tab.to" :to="tab.to" :value="tab.to">
        <v-icon>{{ tab.icon }}</v-icon>
        <span>{{ tab.label }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
  title: string
}>()

const route = useRoute()
const activeTab = computed(() => route.path)

const tabs = [
  { icon: 'mdi-home',    label: 'ホーム',       to: '/'          },
  { icon: 'mdi-magnify', label: '検索',         to: '/search'    },
  { icon: 'mdi-heart',   label: 'お気に入り',   to: '/favorites' },
  { icon: 'mdi-cog',     label: '設定',         to: '/settings'  },
]
</script>
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 3: コミット**

```bash
git add src/components/layout/MainLayout.vue
git commit -m "feat: add MainLayout with BottomNav"
```

---

## Task 5: SubLayout.vue を作成する

**Files:**
- Create: `src/components/layout/SubLayout.vue`

- [ ] **Step 1: ファイルを作成する**

```vue
<template>
  <v-layout>
    <v-app-bar color="primary" elevation="2">
      <template #prepend>
        <v-btn icon @click="router.back()">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
      </template>
      <v-app-bar-title>{{ title }}</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <slot />
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
}>()

const router = useRouter()
</script>
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 3: コミット**

```bash
git add src/components/layout/SubLayout.vue
git commit -m "feat: add SubLayout for stack navigation screens"
```

---

## Task 6: HomePage.vue を作成する（MenuPage.vue をリネーム・改修）

**Files:**
- Create: `src/pages/HomePage.vue`（MenuPage.vue の内容を移行・改修）

- [ ] **Step 1: HomePage.vue を作成する**

`src/pages/HomePage.vue` を以下の内容で作成する。MenuPage.vue の内容を MainLayout ベースに書き換える：

```vue
<template>
  <MainLayout title="VuetifyPoC">
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
  </MainLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'

const router = useRouter()

const menuItems = [
  {
    title: '商品を探す',
    icon: 'mdi-magnify',
    description: '商品の検索・絞り込みができます',
    to: '/search',
  },
  {
    title: 'お気に入り',
    icon: 'mdi-heart',
    description: 'お気に入り商品の一覧',
    to: '/favorites',
  },
  {
    title: '設定',
    icon: 'mdi-cog',
    description: 'アプリの設定',
    to: '/settings',
  },
]
</script>
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 3: コミット**

```bash
git add src/pages/HomePage.vue
git commit -m "feat: add HomePage using MainLayout"
```

---

## Task 7: FavoritePage.vue と SettingsPage.vue を作成する

**Files:**
- Create: `src/pages/FavoritePage.vue`
- Create: `src/pages/SettingsPage.vue`

- [ ] **Step 1: FavoritePage.vue を作成する**

```vue
<template>
  <MainLayout title="お気に入り">
    <v-container class="py-6">
      <v-alert type="info" variant="tonal">
        お気に入り機能は準備中です。
      </v-alert>
    </v-container>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
</script>
```

- [ ] **Step 2: SettingsPage.vue を作成する**

```vue
<template>
  <MainLayout title="設定">
    <v-container class="py-6">
      <v-alert type="info" variant="tonal">
        設定機能は準備中です。
      </v-alert>
    </v-container>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
</script>
```

- [ ] **Step 3: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 4: コミット**

```bash
git add src/pages/FavoritePage.vue src/pages/SettingsPage.vue
git commit -m "feat: add FavoritePage and SettingsPage placeholders"
```

---

## Task 8: SearchPage.vue を MainLayout に移行する

**Files:**
- Modify: `src/pages/SearchPage.vue`

- [ ] **Step 1: SearchPage.vue の `<template>` を書き換える**

`<v-layout>` + `<AppHeader>` + `<AppFooter>` のラッパーを `<MainLayout>` に置き換える。`<v-main>` の中身はそのまま残す。

```vue
<template>
  <MainLayout title="商品検索">
    <v-container class="pb-6">
      <!-- キーワード検索 -->
      <v-text-field
        v-model="store.keyword"
        label="キーワード検索"
        prepend-inner-icon="mdi-magnify"
        clearable
        variant="outlined"
        class="mt-4"
        @update:model-value="store.resetPage()"
      />

      <!-- 詳細検索（アコーディオン） -->
      <v-expansion-panels class="mb-4">
        <v-expansion-panel>
          <v-expansion-panel-title>詳細検索</v-expansion-panel-title>
          <v-expansion-panel-text>
            <p class="text-subtitle-2 mb-1">カテゴリ</p>
            <v-radio-group
              v-model="store.selectedCategory"
              inline
              class="mb-3"
              @update:model-value="store.resetPage()"
            >
              <v-radio label="すべて" value="" />
              <v-radio
                v-for="cat in categories"
                :key="cat"
                :label="cat"
                :value="cat"
              />
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

      <!-- 件数表示 -->
      <p class="text-body-2 mb-3 text-medium-emphasis">
        {{ store.filteredProducts.length }}件
      </p>

      <!-- 商品一覧 -->
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

      <!-- ページネーション -->
      <v-pagination
        v-if="store.totalPages > 1"
        v-model="store.currentPage"
        :length="store.totalPages"
        class="mt-4"
      />
    </v-container>

    <!-- クイックビューダイアログ -->
    <ProductDialog
      v-model="dialogOpen"
      :product="store.selectedProduct"
      @detail="goDetail"
    />
  </MainLayout>
</template>
```

- [ ] **Step 2: `<script setup>` の import を更新する**

`AppHeader` と `AppFooter` の import を `MainLayout` に置き換える：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import type { Product } from '@/types/product'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDialog from '@/components/product/ProductDialog.vue'

const store = useProductStore()
const router = useRouter()
const dialogOpen = ref(false)

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ'] as const

function openDialog(product: Product) {
  store.selectProduct(product)
  dialogOpen.value = true
}

function goDetail(product: Product) {
  dialogOpen.value = false
  store.selectProduct(product)
  router.push(`/detail/${product.id}`)
}
</script>
```

- [ ] **Step 3: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 4: コミット**

```bash
git add src/pages/SearchPage.vue
git commit -m "refactor: migrate SearchPage to MainLayout"
```

---

## Task 9: DetailPage.vue を SubLayout に移行する

**Files:**
- Modify: `src/pages/DetailPage.vue`

- [ ] **Step 1: DetailPage.vue の `<template>` を書き換える**

`<v-layout>` + `<AppHeader :show-back="true">` + `<AppFooter>` を `<SubLayout>` に置き換える。

```vue
<template>
  <SubLayout :title="product?.name ?? '詳細'">
    <v-container v-if="product" class="pb-6">
      <v-tabs v-model="tab" class="mb-4" color="primary">
        <v-tab value="info">商品情報</v-tab>
        <v-tab value="reviews">レビュー</v-tab>
        <v-tab value="related">関連商品</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- 商品情報タブ -->
        <v-window-item value="info">
          <v-card>
            <v-card-title>{{ product.name }}</v-card-title>
            <v-card-subtitle>{{ product.category }}</v-card-subtitle>
            <v-card-text>
              <p class="text-h5 mb-2">¥{{ product.price.toLocaleString() }}</p>
              <v-chip
                :color="product.inStock ? 'success' : 'error'"
                variant="tonal"
                class="mb-3"
              >
                {{ product.inStock ? '在庫あり' : '在庫なし' }}
              </v-chip>
              <v-rating
                :model-value="product.rating"
                readonly
                color="amber"
                class="mb-3"
              />
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
        </v-window-item>

        <!-- レビュータブ -->
        <v-window-item value="reviews">
          <v-radio-group
            v-model="reviewFilter"
            label="評価で絞り込み"
            inline
            class="mb-3"
          >
            <v-radio label="すべて" :value="0" />
            <v-radio
              v-for="n in 5"
              :key="n"
              :label="`${n}★`"
              :value="n"
            />
          </v-radio-group>
          <v-expansion-panels v-if="filteredReviews.length > 0">
            <v-expansion-panel
              v-for="review in filteredReviews"
              :key="review.id"
            >
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
          <v-alert v-else type="info" variant="tonal">
            該当するレビューがありません。
          </v-alert>
        </v-window-item>

        <!-- 関連商品タブ -->
        <v-window-item value="related">
          <template v-if="relatedProducts.length > 0">
            <ProductCard
              v-for="p in relatedProducts"
              :key="p.id"
              :product="p"
              @click="goDetail(p)"
              @detail="goDetail(p)"
            />
          </template>
          <v-alert v-else type="info" variant="tonal">
            関連商品はありません。
          </v-alert>
        </v-window-item>
      </v-window>
    </v-container>

    <v-container v-else>
      <v-alert type="error" variant="tonal">商品が見つかりませんでした。</v-alert>
    </v-container>
  </SubLayout>
</template>
```

- [ ] **Step 2: `<script setup>` の import を更新する**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import type { Product } from '@/types/product'
import SubLayout from '@/components/layout/SubLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'

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

const relatedProducts = computed(() => {
  if (!product.value) return []
  return store.products
    .filter(p => p.category === product.value!.category && p.id !== product.value!.id)
    .slice(0, 4)
})

function goDetail(p: Product) {
  store.selectProduct(p)
  router.push(`/detail/${p.id}`)
}
</script>
```

- [ ] **Step 3: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 4: コミット**

```bash
git add src/pages/DetailPage.vue
git commit -m "refactor: migrate DetailPage to SubLayout"
```

---

## Task 10: router/index.ts を更新する

**Files:**
- Modify: `src/router/index.ts`

- [ ] **Step 1: ルートを更新する**

```ts
import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import DetailPage from '@/pages/DetailPage.vue'
import FavoritePage from '@/pages/FavoritePage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',           component: HomePage      },
    { path: '/search',     component: SearchPage    },
    { path: '/favorites',  component: FavoritePage  },
    { path: '/settings',   component: SettingsPage  },
    { path: '/detail/:id', component: DetailPage, props: true },
  ],
})

export default router
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 3: コミット**

```bash
git add src/router/index.ts
git commit -m "feat: update router with 4-tab routes"
```

---

## Task 11: App.vue を簡略化する

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: App.vue を `<router-view />` のみにする**

現在すでに `<router-view />` のみの構成だが、念のため確認し以下の状態にする：

```vue
<template>
  <v-app>
    <router-view />
  </v-app>
</template>
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

- [ ] **Step 3: コミット（変更がある場合のみ）**

```bash
git add src/App.vue
git commit -m "refactor: simplify App.vue to router-view only"
```

---

## Task 12: 旧ファイルを削除する

**Files:**
- Delete: `src/components/layout/AppHeader.vue`
- Delete: `src/components/layout/AppFooter.vue`
- Delete: `src/pages/MenuPage.vue`

- [ ] **Step 1: AppHeader.vue・AppFooter.vue・MenuPage.vue を削除する**

削除前に、これらのファイルを import しているファイルが残っていないことを確認する：

```powershell
Select-String -Path "src/**/*.vue","src/**/*.ts" -Pattern "AppHeader|AppFooter|MenuPage" -Recurse
```

何も出力されないことを確認してから削除する：

```powershell
Remove-Item src/components/layout/AppHeader.vue
Remove-Item src/components/layout/AppFooter.vue
Remove-Item src/pages/MenuPage.vue
```

- [ ] **Step 2: ビルドが通ることを確認する**

```powershell
npm run build
```

エラーが出た場合は、出力に従って残っている import を修正する。

- [ ] **Step 3: コミット**

```bash
git add -A
git commit -m "chore: remove deprecated AppHeader, AppFooter, and MenuPage"
```

---

## Task 13: 動作確認と Android 同期

- [ ] **Step 1: ブラウザで動作確認する**

```powershell
npm run dev
```

`http://localhost:3000` を開き、以下を確認する：
- ボトムナビの4タブが表示されている
- ホーム・検索・お気に入り・設定タブをタップして画面が切り替わる
- 検索画面から商品をタップすると詳細ページ（SubLayout）に遷移する
- 詳細ページに戻るボタンが表示され、押すと検索画面に戻る
- BottomNav が詳細ページでは表示されないことを確認

- [ ] **Step 2: プロダクションビルドと Android 同期**

```powershell
npm run build
npx cap sync android
```

- [ ] **Step 3: Android Studio でビルドして実機/エミュレータで確認**

Android Studio で **Build > Clean Project** → **Run** し、以下を確認する：
- ボトムナビが正しく表示される
- タブ切り替えが動作する
- 詳細画面への遷移と戻る動作が動作する

- [ ] **Step 4: 最終コミット**

```bash
git add -A
git commit -m "feat: complete Android layout redesign with MainLayout and SubLayout"
```
