# Vue 3 リファレンス（プロジェクト実例付き）

## `<script setup lang="ts">` の基本

このプロジェクトの全コンポーネントで使っているスタイル。  
`setup()` の戻り値を書く必要がなく、トップレベルに書いたものが自動でテンプレートから使える。

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// テンプレートで直接使える
const count = ref(0)
const double = computed(() => count.value * 2)
</script>

<template>
  <p>{{ count }} / {{ double }}</p>
  <button @click="count++">増やす</button>
</template>
```

---

## リアクティビティ

### ref

プリミティブ値（string / number / boolean）やオブジェクト全体を reactive にする。  
`.value` でアクセスする（テンプレート内は自動アンラップされるので `.value` 不要）。

```ts
const count = ref(0)
const name = ref('')
const open = ref(false)
const product = ref<Product | null>(null)
const items = ref<MenuItem[]>([])

// 変更はすべて .value 経由
count.value++
name.value = '緑茶'
items.value = fetchedItems

// テンプレート内では .value 不要
// <p>{{ count }}</p>   → 0
// <p>{{ name }}</p>    → '緑茶'
```

### reactive

オブジェクトをまとめてリアクティブにする（プロパティに直接アクセスできる）。  
プリミティブには使えない。`ref` のほうが汎用性が高いため `ref` が主流。

```ts
// src/composables/useSnackbar.ts
const state = reactive<{
  show: boolean
  color: SnackColor
  text: string
}>({
  show: false,
  color: 'success',
  text: '',
})

// .value なしで直接アクセス
state.show = true
state.text = 'メッセージ'
```

### computed

依存する ref が変わったときだけ再計算されるキャッシュ付き値。

```ts
// src/stores/product.ts
const filteredProducts = computed(() =>
  products.value.filter(p => {
    const matchKeyword = !keyword.value || p.name.includes(keyword.value)
    const matchCategory = !selectedCategory.value || p.category === selectedCategory.value
    return matchKeyword && matchCategory
  })
)

// 読み取り専用（書き込もうとするとエラー）
// filteredProducts.value = []  // ← NG

// 読み書き両方できる computed（getter + setter）
const modelValue = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
```

### watch

ref や computed の変化を監視して副作用を実行する。

```ts
import { watch, watchEffect } from 'vue'

// 単一の ref を監視
watch(product, (newVal, oldVal) => {
  localMemo.value = newVal ? memoStore.getMemo(newVal.id) : ''
})

// 即時実行（immediate: true）
watch(product, (p) => {
  localMemo.value = p ? memoStore.getMemo(p.id) : ''
}, { immediate: true })  // マウント直後にも実行される

// 複数の依存を監視
watch([keyword, selectedCategory], ([kw, cat]) => {
  resetPage()
})

// computed を監視（params が変わるたびに API 再実行）
watch(params, execute, { immediate: true })

// watchEffect: 依存を自動検出（明示しなくていい）
watchEffect(() => {
  console.log(count.value)   // count を参照しているので自動で監視
})
```

---

## ライフサイクルフック

```ts
import { onMounted, onUnmounted, onBeforeUnmount } from 'vue'

onMounted(() => {
  // DOM がマウントされた後に実行
  // → API 呼び出し、カメラ起動、pending 結果の消費など
  store.fetchMenu()
  start()   // useBarcodeScanner

  const result = store.consumePendingResult()  // スキャン結果の受け取り
  if (result) emit('update:modelValue', result.text)
})

onUnmounted(() => {
  // コンポーネントが破棄された後に実行
  // → タイマー解除、カメラ停止など
  stop()    // useBarcodeScanner
})

onBeforeUnmount(() => {
  // 破棄される直前（DOM がまだある）
})
```

---

## defineProps / defineEmits

### defineProps（TypeScript 記法）

```vue
<script setup lang="ts">
// 型引数で props の型を定義（ランタイムの defineProps より型安全）
const props = defineProps<{
  title: string          // 必須
  modelValue?: string    // オプショナル（省略可）
  items?: string[]
  disabled?: boolean
}>()

// デフォルト値をつける場合は withDefaults でラップ
const props = withDefaults(
  defineProps<{
    modelValue?: string
    items?: string[]
  }>(),
  {
    modelValue: '',
    items: () => [],    // 配列・オブジェクトは関数で返す（参照共有を防ぐ）
  }
)
</script>

<!-- 使い方 -->
<MyComponent title="商品検索" :items="['A', 'B']" />
```

### defineEmits（TypeScript 記法）

```ts
// タプル型で引数を定義
const emit = defineEmits<{
  'update:modelValue': [value: string]   // v-model 用
  confirm: []                            // 引数なし
  cancel: []
  scan: [result: ScanResult]
  remove: [key: 'category' | 'inStock']
}>()

// 使い方
emit('update:modelValue', '新しい値')
emit('confirm')
emit('scan', { text: '123', format: 'QR_CODE', timestamp: Date.now() })
```

### defineModel（v-model の簡略記法）

```ts
// ConfirmDialog.vue のように単純な boolean v-model
const model = defineModel<boolean>()

// テンプレート
// <v-dialog v-model="model">
```

---

## defineOptions

```ts
// inheritAttrs を false にする（$attrs の自動継承を無効化）
// → SelectPickerField や BarcodeInputField で使用
defineOptions({ inheritAttrs: false })

// 使う理由:
// コンポーネントの root 要素が複数ある場合、どの要素に attrs を継承するか
// 自分で v-bind="$attrs" を使って制御したいとき
```

---

## $attrs と v-bind="$attrs"

```vue
<!-- SelectPickerField.vue -->
<template>
  <!-- v-text-field に親からの attrs（class, error, error-messages等）を渡す -->
  <v-text-field
    v-bind="$attrs"
    :model-value="modelValue"
    ...
  />
  <!-- ↑ 上: $attrs はここに適用 -->
  <!-- ↓ 下: ダイアログには適用しない -->
  <v-dialog v-model="open">...</v-dialog>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })  // 自動継承を切る
</script>
```

```vue
<!-- 親コンポーネントからの使い方 -->
<SelectPickerField
  v-model="location"
  label="ロケーション"
  :error="!!fieldErrors.location"
  :error-messages="fieldErrors.location"
/>
<!-- error と error-messages は $attrs 経由で v-text-field に渡る -->
```

---

## スロット

### デフォルトスロット

```vue
<!-- SubLayout.vue（定義側） -->
<template>
  <v-main>
    <slot />   <!-- 親から渡された内容がここに入る -->
  </v-main>
</template>

<!-- 親（使う側） -->
<SubLayout title="詳細">
  <v-container>ここがスロットの中身</v-container>
</SubLayout>
```

### 名前付きスロット

```vue
<!-- SubLayout.vue（定義側） -->
<template>
  <v-app-bar>
    <template v-if="$slots.actions" #append>
      <slot name="actions" />   <!-- 名前付きスロット -->
    </template>
  </v-app-bar>
  <v-bottom-navigation v-if="$slots.footer">
    <slot name="footer" />
  </v-bottom-navigation>
</template>

<!-- 親（使う側） -->
<SubLayout title="詳細">
  <template #actions>
    <v-btn icon @click="open = true">...</v-btn>
  </template>

  <template #footer>
    <v-btn color="primary" @click="save">登録</v-btn>
  </template>

  <!-- デフォルトスロット（#default は省略可） -->
  <v-container>メインコンテンツ</v-container>
</SubLayout>
```

### $slots で存在チェック

```ts
// MainLayout.vue
import { useSlots } from 'vue'
const slots = useSlots()
const hasFooterSlot = computed(() => !!slots.footer)
// → v-if="hasFooterSlot" でスロットの有無によってレンダリングを切り替える
```

---

## テンプレート構文

### 条件分岐

```vue
<!-- v-if / v-else-if / v-else: 条件が false の要素は DOM から除去される -->
<v-progress-linear v-if="isLoading" indeterminate />
<v-alert v-else-if="isError" type="error">失敗</v-alert>
<div v-else>{{ data }}</div>

<!-- v-show: 常に DOM に存在し、display: none で切り替える（切替コストが低い） -->
<div v-show="isVisible">表示</div>
```

### リスト描画

```vue
<!-- v-for: :key は必須（変更検知に使う） -->
<v-list-item
  v-for="item in menuStore.items"
  :key="item.id"
  :title="item.label"
/>

<!-- インデックスも取れる -->
<div v-for="(error, index) in errorHistory" :key="index">
  {{ index + 1 }}: {{ error.message }}
</div>

<!-- オブジェクトのループ -->
<div v-for="(value, key) in obj" :key="key">
  {{ key }}: {{ value }}
</div>

<!-- 数値（1〜5）のループ -->
<v-icon v-for="n in 5" :key="n">mdi-star</v-icon>
```

### バインディング

```vue
<!-- : は v-bind: の略 -->
<v-btn :color="isActive ? 'primary' : 'default'" :disabled="isLoading">
  ボタン
</v-btn>

<!-- 複数の attr をまとめてバインド -->
<v-text-field v-bind="$attrs" v-bind="fieldProps" />

<!-- class の動的バインド -->
<div :class="{ active: isActive, error: hasError }">
<div :class="['base-class', isActive ? 'active' : '']">

<!-- style の動的バインド -->
<div :style="{ height: isDev ? 'calc(100dvh - 112px)' : 'calc(100dvh - 52px)' }">
```

### イベント

```vue
<!-- @ は v-on: の略 -->
<v-btn @click="handleClick">クリック</v-btn>
<input @input="onInput" @keydown.enter="onEnter" />

<!-- イベント修飾子 -->
<v-btn @click.stop="open = true">   <!-- 親への伝播を止める -->
<v-btn @click.prevent="submit">     <!-- デフォルト動作をキャンセル -->
<input @keydown.enter="search">     <!-- Enter キーのみ -->
<v-btn @click.stop.prevent="fn">   <!-- 複数修飾子 -->

<!-- インライン式（シンプルな場合のみ） -->
<v-btn @click="count++">
<v-btn @click="open = !open">
```

### v-model

```vue
<!-- input の値とリアクティブな値を双方向バインド -->
<v-text-field v-model="keyword" />
<!-- 展開すると: :model-value="keyword" @update:model-value="keyword = $event" -->

<!-- カスタムコンポーネントの v-model -->
<SelectPickerField v-model="localLocation" />
<!-- 展開すると: :model-value="localLocation" @update:model-value="localLocation = $event" -->

<!-- 型付き v-model（コンポーネント側） -->
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
// emit('update:modelValue', newValue) で親の v-model を更新
```

---

## Composable（カスタムフック）

ロジックを再利用するための関数。`use` で始まる命名が慣習。

```ts
// src/composables/useSnackbar.ts
const state = reactive({ show: false, color: 'success', text: '' })

export function useSnackbar() {
  function showSnack(color: SnackColor, text: string) {
    state.color = color
    state.text = text
    state.show = true
  }
  return { state, showSnack }
}

// 使い方（複数コンポーネントで同じ state を共有）
const { showSnack } = useSnackbar()
showSnack('success', '登録しました')
```

```ts
// src/composables/useAsync.ts
export function useAsync<T>(fn: () => Promise<T>, deps?: WatchSource) {
  const data = ref<T | null>(null)
  const isLoading = ref(false)
  const isError = ref(false)

  async function execute() {
    isLoading.value = true
    try {
      data.value = await fn()
    } catch {
      isError.value = true
    } finally {
      isLoading.value = false
    }
  }

  if (deps) watch(deps, execute, { immediate: true })
  else execute()

  return { data, isLoading, isError, execute }
}

// 使い方
const { data, isLoading, isError } = useAsync(
  () => getProducts(params.value),
  params,    // params が変わるたびに自動で再実行
)
```

---

## Pinia（状態管理）

### setup store の定義

```ts
// src/stores/memo.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMemoStore = defineStore('memo', () => {
  // state: ref で定義
  const memos = ref<Record<number, string>>({})

  // getters: computed で定義
  const count = computed(() => Object.keys(memos.value).length)

  // actions: 関数として定義
  function setMemo(productId: number, text: string) {
    memos.value[productId] = text
  }
  function getMemo(productId: number): string {
    return memos.value[productId] ?? ''
  }

  return { memos, count, setMemo, getMemo }
}, {
  persist: true,   // pinia-plugin-persistedstate で localStorage に保存
})

// 使い方
const memoStore = useMemoStore()
memoStore.setMemo(1, 'メモ内容')
console.log(memoStore.getMemo(1))
```

### storeToRefs（リアクティビティを保ちつつ分割代入）

```ts
import { storeToRefs } from 'pinia'
const store = useProductStore()

// NG: リアクティビティが失われる
const { keyword, filteredProducts } = store

// OK: ref としてそのまま使える
const { keyword, filteredProducts } = storeToRefs(store)
// actions は storeToRefs 不要
const { resetPage, selectProduct } = store
```

---

## Vue Router

```ts
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 遷移
router.push('/products')
router.push({ path: '/products', query: { q: '緑茶', category: '食品' } })
router.push(`/detail/${product.id}`)
router.back()    // 前のページに戻る

// 現在のルート情報
route.path          // '/products'
route.query.q       // '緑茶'
route.params.id     // '1'（動的セグメント）

// クエリを computed で取得（変化に追従）
const queryQ = computed(() => route.query.q as string | undefined)
const queryCategory = computed(() => route.query.category as string | undefined)
```

---

## テンプレート参照（ref で DOM 要素を取得）

```ts
// ref をテンプレートに紐付ける
const videoRef = ref<HTMLVideoElement | null>(null)

// マウント後にアクセスできる
onMounted(() => {
  if (videoRef.value) {
    videoRef.value.play()
  }
})
```

```vue
<template>
  <!-- ref 属性でコンポーネントを参照（変数名と合わせる） -->
  <video ref="videoRef" />
</template>
```

---

## よく使うパターン集

### パターン 1: 非同期データ取得（onMounted + store）

```ts
onMounted(() => {
  if (!menuStore.items?.length) {
    menuStore.fetchMenu()
  }
})
```

### パターン 2: v-model の実装（親子間の双方向バインド）

```vue
<!-- 子コンポーネント -->
<script setup lang="ts">
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()
</script>

<template>
  <input
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
```

### パターン 3: 条件付きスロット（$slots で分岐）

```ts
const slots = useSlots()
const hasFooterSlot = computed(() => !!slots.footer)
```

```vue
<template>
  <v-bottom-navigation v-if="hasFooterSlot || footerActions">
    <template v-if="hasFooterSlot">
      <slot name="footer" />
    </template>
    <template v-else-if="footerActions">
      <v-btn v-for="a in footerActions" :key="a.label" @click="a.onClick">
        {{ a.label }}
      </v-btn>
    </template>
  </v-bottom-navigation>
</template>
```

### パターン 4: 一覧のフィルタ + ページネーション

```ts
const filteredProducts = computed(() =>
  products.value.filter(p =>
    (!keyword.value || p.name.includes(keyword.value)) &&
    (!selectedCategory.value || p.category === selectedCategory.value)
  )
)
const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredProducts.value.slice(start, start + PAGE_SIZE)
})
const totalPages = computed(() => Math.ceil(filteredProducts.value.length / PAGE_SIZE))
```

### パターン 5: watch で副作用（product が変わったらメモをリセット）

```ts
watch(
  product,
  (p) => { localMemo.value = p ? memoStore.getMemo(p.id) : '' },
  { immediate: true },  // マウント時にも実行
)
```

### パターン 6: イベント修飾子で伝播制御

```vue
<!-- ドロップダウンを開くボタンが v-text-field 内にある場合 -->
<!-- @click.stop がないと field の @click も発火して二重で開く -->
<v-btn @click.stop="open = true">
  <v-icon>mdi-chevron-down</v-icon>
</v-btn>

<!-- clearable の × ボタンも伝播を止める -->
@click:clear.stop="emit('update:modelValue', '')"
```

### パターン 7: 環境変数で開発専用機能

```ts
const isDev = import.meta.env.DEV   // Vite の環境変数（本番では false）

// テンプレート内
// <div v-if="isDev">開発専用モック入力</div>
```
