# Vol.1 コンポーネント・レイアウト共通化

Vue / Vuetify 4 — このプロジェクトの実コードによる解説リファレンス。

---

## 1. 共通化しないと何が起きるか

共通化する前は、AppBar・BottomNavigation のコードが全ページに繰り返される。

```html
<!-- HomePage.vue（共通化前の仮コード） -->
<template>
  <v-layout>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>VuetifyPoC</v-app-bar-title>
    </v-app-bar>
    <v-main>...ページ固有の内容...</v-main>
    <v-bottom-navigation color="primary">
      <v-btn to="/"><v-icon>mdi-home</v-icon><span>ホーム</span></v-btn>
      <v-btn to="/search"><v-icon>mdi-magnify</v-icon><span>検索</span></v-btn>
      <v-btn to="/favorites"><v-icon>mdi-heart</v-icon><span>お気に入り</span></v-btn>
      <v-btn to="/settings"><v-icon>mdi-cog</v-icon><span>設定</span></v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>
```

SearchPage.vue にも FavoritesPage.vue にも SettingsPage.vue にもまったく同じコードが繰り返される。

**発生する問題：**

1. **修正コストが N 倍になる** — BottomNavigation にタブを追加したら全ページを手で直す必要がある
2. **バグが混入しやすい** — あるページだけ古いアイコンが残る、色だけ違うなどの差異が生まれる
3. **レビューコストが上がる** — 「このページだけ微妙に違う」を毎回チェックしなければならない

10ページになったら？ 20ページになったら？ コードの量は増えるが、チームの生産性は落ちていく一方。

---

## 2. レイアウト共通化：MainLayout / SubLayout

### MainLayout.vue — 実際のコード

```html
<!-- src/components/layout/MainLayout.vue -->
<template>
  <v-layout>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>{{ title }}</v-app-bar-title>  <!-- props で差し替え -->
      <template v-if="$slots.actions" #append>
        <slot name="actions" />  <!-- 右端のボタン置き場（任意） -->
      </template>
    </v-app-bar>
    <v-main>
      <slot />  <!-- ページ固有コンテンツがここに入る -->
    </v-main>
    <v-bottom-navigation v-model="activeTab" color="primary">
      <v-btn v-for="tab in tabs" :key="tab.to" :to="tab.to" :value="tab.to">
        <v-icon>{{ tab.icon }}</v-icon>
        <span>{{ tab.label }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>
```

```html
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{ title: string }>()  // タイトルだけを受け取る

const route = useRoute()
const activeTab = computed(() => route.path)  // 現在のパスでタブをハイライト

const tabs = [
  { icon: 'mdi-home',    label: 'ホーム',     to: '/'          },
  { icon: 'mdi-magnify', label: '検索',       to: '/search'    },
  { icon: 'mdi-heart',   label: 'お気に入り', to: '/favorites' },
  { icon: 'mdi-cog',     label: '設定',       to: '/settings'  },
]
</script>
```

### 構造図

```
<MainLayout title="...">
  ┌─────────────────────────────┐
  │ v-app-bar  [title] [actions?]│  ← slot name="actions" は任意
  ├─────────────────────────────┤
  │ v-main                       │
  │   <slot />  ← ページ固有     │
  ├─────────────────────────────┤
  │ v-bottom-navigation          │  ← tabs 配列で自動生成
  └─────────────────────────────┘
</MainLayout>
```

### 呼び出し側がどれだけシンプルになるか

```html
<!-- HomePage.vue —— title だけ渡せばレイアウト完成 -->
<template>
  <MainLayout title="VuetifyPoC">
    <v-container class="py-6">
      <!-- ページ固有の内容だけここに書く -->
      <v-row>
        <v-col v-for="item in menuItems" :key="item.title" cols="12" sm="6" md="4">
          <v-card ...>...</v-card>
        </v-col>
      </v-row>
    </v-container>
  </MainLayout>
</template>
```

```html
<!-- SearchPage.vue —— 同じパターン -->
<template>
  <MainLayout title="商品検索">
    <v-container class="pb-6">
      <!-- 検索フィールド・商品一覧・ページネーションだけ -->
    </v-container>
  </MainLayout>
</template>
```

AppBar・BottomNavigation の実装は MainLayout に一行も書かなくていい。

### MainLayout vs SubLayout — 使い分け

| コンポーネント | BottomNav | 戻るボタン | 使用ページ |
|---|---|---|---|
| **MainLayout** | あり | なし | Home / Search / Favorites / Settings |
| **SubLayout** | なし | あり | Detail（詳細画面） |

### SubLayout.vue — 実際のコード

```html
<!-- src/components/layout/SubLayout.vue -->
<template>
  <v-layout>
    <v-app-bar color="primary" elevation="2">
      <template #prepend>
        <v-btn icon="mdi-arrow-left" @click="router.back()" />
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

### DetailPage.vue での使い方

```html
<!-- src/pages/DetailPage.vue —— SubLayout の実際の使い方 -->
<template>
  <SubLayout :title="product?.name ?? '詳細'">
    <v-container v-if="product" class="pb-6">
      <!-- タブ・商品情報・レビュー・関連商品 -->
    </v-container>
  </SubLayout>
</template>
```

---

## 3. props / emit / defineModel / slot

### 3-1 props — 親から子へデータを渡す

```html
<!-- ProductCard.vue —— 型安全な defineProps -->
<script setup lang="ts">
import type { Product } from '@/types/product'

defineProps<{ product: Product }>()
</script>
```

**`: (コロン)` の有無に注意：**

```html
<!-- ✅ : あり → JS 式として評価（変数・オブジェクト・計算値） -->
<ProductCard :product="item" />

<!-- ✅ : なし → 文字列リテラルとして渡す -->
<MainLayout title="商品検索" />

<!-- ❌ これは "商品検索" という文字列ではなく変数 商品検索 を探してしまう -->
<MainLayout :title="商品検索" />
```

ルール：固定の文字列は `title="..."`, 変数・式は `:title="..."`

**withDefaults — 省略可能な props にデフォルト値を設定：**

```html
<!-- BaseDialog.vue -->
<script setup lang="ts">
withDefaults(defineProps<{
  title: string      // 必須（デフォルトなし）
  maxWidth?: string  // 省略可能
}>(), {
  maxWidth: '500px', // 省略した場合のデフォルト値
})

const model = defineModel<boolean>()
</script>
```

```html
<!-- maxWidth を省略 → '500px' が使われる -->
<BaseDialog v-model="open" title="確認">
  本当に削除しますか？
</BaseDialog>

<!-- maxWidth を明示指定 → '400px' が使われる -->
<!-- HTML 属性はケバブケース (max-width)、defineProps の型はキャメルケース (maxWidth) -->
<ConfirmDialog v-model="open" title="確認" max-width="400px" />
```

> Vue は HTML 属性のケバブケース (`max-width`) と props のキャメルケース (`maxWidth`) を自動変換する。テンプレートではどちらの書き方でも動作するが、HTML 属性では `max-width` が慣例。

---

### 3-2 emit — 子から親へイベントを通知

```html
<!-- ProductCard.vue -->
<script setup lang="ts">
import type { Product } from '@/types/product'

defineProps<{ product: Product }>()
const emit = defineEmits<{
  click:  [product: Product]  // カード全体クリック
  detail: [product: Product]  // 「詳細を見る」ボタン
}>()
</script>
```

```html
<!-- ProductCard.vue template —— emit の呼び出し -->
<v-card class="mb-3" @click="emit('click', product)">
  ...
  <v-card-actions>
    <!-- .stop でカードの @click に伝播しないようにする -->
    <v-btn @click.stop="emit('detail', product)">詳細を見る</v-btn>
  </v-card-actions>
</v-card>
```

`@click.stop` を使う理由：`v-card-actions` 内のボタンをクリックすると、通常はカード自体の `@click` にもイベントが伝播する。`.stop` 修飾子でバブリングを止めることで `click` と `detail` を区別できる。

```html
<!-- SearchPage.vue —— 親側でイベントを受け取る -->
<ProductCard
  v-for="product in store.pagedProducts"
  :key="product.id"
  :product="product"
  @click="openDialog(product)"  <!-- クイックビュー -->
  @detail="goDetail(product)"   <!-- 詳細画面へ遷移 -->
/>
```

---

### 3-3 defineModel — v-model で双方向バインディング

```html
<!-- BaseDialog.vue —— defineModel で開閉状態を受け取る -->
<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  maxWidth?: string
}>(), { maxWidth: '500px' })

const model = defineModel<boolean>()  // ← これだけ！
</script>
```

```html
<!-- BaseDialog.vue template —— model を v-dialog に直接バインド -->
<v-dialog v-model="model" :max-width="maxWidth">
  ...
</v-dialog>
```

```html
<!-- SearchPage.vue —— 親は ref を v-model で渡すだけ -->
<script setup lang="ts">
const dialogOpen = ref(false)

function openDialog(product: Product) {
  store.selectProduct(product)
  dialogOpen.value = true  // ← ダイアログを開く
}
</script>

<ProductDialog v-model="dialogOpen" :product="store.selectedProduct" />
```

> `defineModel` は `props(modelValue)` + `emit('update:modelValue')` のシュガー構文。子がモデルを書き換えると親の ref も自動で更新される。

---

### 3-4 slot — コンテンツを外から差し込む

```html
<!-- BaseDialog.vue —— デフォルトスロット + 名前付きスロット -->
<template>
  <v-dialog v-model="model" :max-width="maxWidth">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <slot />  <!-- デフォルトスロット：本文コンテンツ -->
      </v-card-text>
      <v-card-actions v-if="$slots.actions">  <!-- 渡された時だけ表示 -->
        <slot name="actions" />  <!-- 名前付きスロット：ボタン置き場 -->
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
```

```html
<!-- ConfirmDialog.vue —— #actions スロットにボタンを差し込む -->
<template>
  <BaseDialog v-model="model" :title="title" max-width="400px">
    <p>{{ message }}</p>  <!-- デフォルトスロットに入る -->
    <template #actions>   <!-- 名前付きスロットに入る -->
      <v-spacer />
      <v-btn variant="text" @click="$emit('cancel')">キャンセル</v-btn>
      <v-btn color="primary" variant="elevated" @click="$emit('confirm')">OK</v-btn>
    </template>
  </BaseDialog>
</template>
```

`v-if="$slots.actions"` を使うことで、`#actions` スロットが渡されなかった場合は `v-card-actions` ごと非表示にできる。

---

### 3-5 4つの仕組みまとめ

| 仕組み | 方向 | 用途 | 実例 |
|---|---|---|---|
| **props** | 親 → 子 | 表示データ・設定値を渡す | `:product="item"` / `title="商品検索"` |
| **emit** | 子 → 親 | ユーザー操作を親に通知 | `@click="openDialog"` / `@detail="goDetail"` |
| **defineModel** | 双方向 | 開閉状態・入力値などの同期 | `v-model="dialogOpen"` |
| **slot** | 親 → 子（構造） | コンテンツの差し込み・カスタマイズ | `<slot />` / `#actions` |

これら4つを組み合わせると、再利用性の高いコンポーネントが作れる。

---

## 4. UIコンポーネント共通化：ProductCard / BaseDialog

### ProductCard.vue — 実際のコード

```html
<!-- src/components/product/ProductCard.vue -->
<template>
  <v-card class="mb-3" @click="emit('click', product)">
    <v-card-title class="text-body-1 font-weight-bold">{{ product.name }}</v-card-title>
    <v-card-subtitle>{{ product.category }}</v-card-subtitle>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-2">
        <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
        <v-chip
          :color="product.inStock ? 'success' : 'error'"
          size="small"
          variant="tonal"
        >
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
      <v-btn
        variant="text"
        color="primary"
        @click.stop="emit('detail', product)"
      >
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

### BaseDialog → ConfirmDialog 継承パターン

BaseDialog は「ダイアログの骨格」を担い、ConfirmDialog は BaseDialog を拡張して「確認ダイアログ」に特化する。

```html
<!-- src/components/dialog/ConfirmDialog.vue -->
<template>
  <BaseDialog v-model="model" :title="title" max-width="400px">
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
  title: string
  message: string
}>()

const model = defineModel<boolean>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
```

**継承パターンのメリット：**
- BaseDialog の `v-dialog`・`v-card`・アニメーション実装をゼロで再利用
- ConfirmDialog は「メッセージ表示 + OK/キャンセル」だけに集中できる
- BaseDialog を直接使えばカスタム内容のダイアログも自由に作れる
- 将来 `v-dialog` の設定を変えたいときは BaseDialog だけ直せばよい

### SearchPage.vue — コンポーネントが連携する全体像

```html
<!-- src/pages/SearchPage.vue template（抜粋） -->
<template>
  <MainLayout title="商品検索">  <!-- レイアウト -->
    <v-container class="pb-6">
      <!-- 商品一覧 -->
      <ProductCard
        v-for="product in store.pagedProducts"
        :key="product.id"
        :product="product"           <!-- props で商品データを渡す -->
        @click="openDialog(product)"  <!-- emit: クイックビューを開く -->
        @detail="goDetail(product)"   <!-- emit: 詳細画面へ遷移 -->
      />
    </v-container>

    <!-- ダイアログ -->
    <ProductDialog
      v-model="dialogOpen"            <!-- defineModel: 開閉を同期 -->
      :product="store.selectedProduct" <!-- props で選択商品を渡す -->
      @detail="goDetail"              <!-- emit: 詳細画面へ遷移 --> <!-- emitted product payload is forwarded automatically -->
    />
  </MainLayout>
</template>
```

```html
<script setup lang="ts">
const store = useProductStore()
const router = useRouter()
const dialogOpen = ref(false)

function openDialog(product: Product) {
  store.selectProduct(product)
  dialogOpen.value = true   // ← ProductCard の @click で呼ばれる
}

function goDetail(product: Product) {
  dialogOpen.value = false
  store.selectProduct(product)
  router.push(`/detail/${product.id}`)
}
</script>
```

---

## 5. 共通化の判断基準

| ルール | 説明 | 例 |
|---|---|---|
| **3回ルール** | 同じコードが3か所以上出たら共通化を検討 | AppBar + BottomNav が全ページに → MainLayout |
| **見た目の統一** | デザインが常に同じなら共通化する | 商品カードは常に同じ見た目 → ProductCard |
| **ロジック分離** | コンポーネント内の責務が明確なら切り出す | ダイアログの開閉 → BaseDialog に隠蔽 |

**共通化しすぎの罠：**

- すべての違いを props で対応しようとして props が10個以上になる
- 「将来使うかも」という理由で抽象化する（YAGNI 違反）
- シンプルさを保てる範囲で共通化する。複雑になったら分割を検討する

---

## 6. チーム規約

- 新規ページは必ず `MainLayout` か `SubLayout` をラッパーに使う
- BottomNavigation 付き（メインタブ画面）は `MainLayout`、戻るボタン付き（サブ画面）は `SubLayout`
- 同じ UI パターンが3か所以上になったらコンポーネント化を提案する
- props は型安全に `defineProps<{...}>()` で定義し、省略可能なものは `withDefaults` でデフォルト値を設定する
- 子から親への通知は emit を使い、双方向の状態同期は `defineModel` を使う
- `@click.stop` などのイベント修飾子でバブリングを適切に制御する
- BaseDialog など汎用コンポーネントを継承して専用コンポーネントを作り、過剰な props の肥大化を避ける
