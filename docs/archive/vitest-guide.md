# Vitest テストガイド — ソースから実装する方法

> **📦 アーカイブ資料**: この資料は旧テスト方式のものです。現行は [guides/team-guide.md](../guides/team-guide.md) の「5. テストの書き方」を参照してください。

このプロジェクトの実際のテストコードを元に、
関数・Store・コンポーネント・ページそれぞれのテスト実装パターンをまとめる。

---

## 目次

1. [セットアップ全体像](#セットアップ全体像)
2. [テストの種別と使い分け](#テストの種別と使い分け)
3. [パターン1: 純粋関数のテスト](#パターン1-純粋関数のテスト)
4. [パターン2: Pinia Store のテスト](#パターン2-pinia-store-のテスト)
5. [パターン3: UIコンポーネントのテスト](#パターン3-uiコンポーネントのテスト)
6. [パターン4: ダイアログコンポーネントのテスト](#パターン4-ダイアログコンポーネントのテスト)
7. [パターン5: ページコンポーネントのテスト（ルーター・モックあり）](#パターン5-ページコンポーネントのテストルーターモックあり)
8. [パターン6: useAsync を使うコンポーネントのテスト](#パターン6-useasync-を使うコンポーネントのテスト)
9. [よく使う Vitest API 早見表](#よく使う-vitest-api-早見表)
10. [テスト設計の考え方](#テスト設計の考え方)
11. [コマンド一覧](#コマンド一覧)

---

## セットアップ全体像

### vitest.config.mts

```typescript
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'
import Vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    Vue(),
    Vuetify({ autoImport: true }),  // Vuetify コンポーネントを自動解決
  ],
  test: {
    environment: 'jsdom',           // ブラウザ環境をシミュレート
    globals: true,                  // describe/it/expect をグローバル利用可
    setupFiles: ['src/test/setup.ts'], // 各テストファイルの前に実行
    server: {
      deps: { inline: ['vuetify'] }, // Vuetify を inline バンドル（必須）
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/api/**',      // Orval 自動生成は除外
        'src/test/**',
        'src/types/**',
        'src/plugins/**',
        'src/main.ts',
      ],
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('src', import.meta.url)) },
  },
})
```

### src/test/setup.ts（全テストの前に実行）

```typescript
// src/test/setup.ts
import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach } from 'vitest'

// jsdom に存在しない Vuetify 依存 API をスタブ
Object.defineProperty(window, 'visualViewport', {
  value: { width: 375, height: 667, scale: 1,
    addEventListener: () => {}, removeEventListener: () => {} },
  writable: true,
})
Object.defineProperty(window, 'ResizeObserver', {
  value: class { observe() {} unobserve() {} disconnect() {} },
  writable: true,
})

// Vuetify をグローバルプラグインに登録（全コンポーネントで有効）
const vuetify = createVuetify({ components, directives })
config.global.plugins = [vuetify]

// 各テストの前に Pinia を初期化（テスト間の状態汚染を防ぐ）
beforeEach(() => {
  setActivePinia(createPinia())
})
```

### ファイル配置ルール

```
src/
  utils/
    searchUtils.ts
    __tests__/
      searchUtils.test.ts    ← 対象ファイルに隣接した __tests__/ に置く

  stores/
    memo.ts
    __tests__/
      memo.test.ts

  components/
    search/
      SearchConditionChips.vue
      __tests__/
        SearchConditionChips.test.ts

  pages/
    __tests__/
      SearchPage.test.ts
```

---

## テストの種別と使い分け

| 種別 | 対象 | mount 必要 | モック必要 | 例 |
|---|---|---|---|---|
| **純粋関数** | utils の関数 | ❌ | ❌ | `buildSearchQuery`, `filterProducts` |
| **Store** | Pinia store | ❌ | ❌（setup で自動初期化） | `useMemoStore` |
| **UIコンポーネント** | 表示専用コンポーネント | ✅ | ❌ | `SearchConditionChips` |
| **ダイアログ** | v-dialog を含むコンポーネント | ✅ + `attachTo` | ❌ | `ProductFilterDialog` |
| **ページ** | router・外部依存があるページ | ✅ + `attachTo` | ✅（router） | `SearchPage` |
| **API 連携ページ** | useAsync を使うページ | ✅ | ✅（API 関数） | `ProductListPage` |

---

## パターン1: 純粋関数のテスト

**対象**: `src/utils/searchUtils.ts`
**特徴**: import してそのまま呼ぶだけ。mount もモックも不要。

### ソース

```typescript
// src/utils/searchUtils.ts
export function buildSearchQuery(
  keyword: string,
  category: string,
  inStock: boolean,
): Record<string, string> {
  const query: Record<string, string> = {}
  if (keyword.trim()) query.q = keyword
  if (category) query.category = category
  if (inStock) query.inStock = 'true'
  return query
}
```

### テスト実装パターン

```typescript
// src/utils/__tests__/searchUtils.test.ts
import { describe, it, expect } from 'vitest'
import { buildSearchQuery } from '../searchUtils'

describe('buildSearchQuery', () => {
  // ① 最もシンプル: 全条件が空のとき
  it('すべて空のとき空オブジェクトを返す', () => {
    expect(buildSearchQuery('', '', false)).toEqual({})
    //                                     ^^^^^^^^
    //   toEqual: オブジェクトの中身を比較（toBe は参照比較なので使わない）
  })

  // ② 値あり: 期待するキーが含まれることを確認
  it('keyword のみ → { q }', () => {
    expect(buildSearchQuery('緑茶', '', false)).toEqual({ q: '緑茶' })
  })

  // ③ 境界値: 空白のみは空扱い
  it('空白のみの keyword は q に含めない', () => {
    expect(buildSearchQuery('   ', '食品', false)).toEqual({ category: '食品' })
  })
})
```

### デシジョンテーブルでケースを網羅する

条件の組み合わせを表にしてから it を書くと漏れがない。

```
条件
  C1: keyword がある
  C2: category がある
  C3: inStock が true

| ケース | C1 | C2 | C3 | 期待 |
|--------|----|----|----|----|
| BQ-1   |  N |  N |  N | {}  |
| BQ-2   |  Y |  N |  N | { q } |
| BQ-3   |  N |  Y |  N | { category } |
| BQ-4   |  N |  N |  Y | { inStock:'true' } |
| BQ-5   |  Y |  Y |  N | { q, category } |
| BQ-8   |  Y |  Y |  Y | { q, category, inStock:'true' } |
```

---

## パターン2: Pinia Store のテスト

**対象**: `src/stores/memo.ts`
**特徴**: `setup.ts` で毎テスト前に `setActivePinia(createPinia())` が実行されるため、
テスト間で状態が汚染されない。

### ソース

```typescript
// src/stores/memo.ts
export const useMemoStore = defineStore('memo', () => {
  const memos = ref<Record<number, string>>({})

  function setMemo(productId: number, text: string) {
    memos.value[productId] = text
  }
  function getMemo(productId: number): string {
    return memos.value[productId] ?? ''
  }
  function hasMemo(productId: number): boolean {
    return !!memos.value[productId]?.trim()
  }

  return { memos, setMemo, getMemo, hasMemo }
})
```

### テスト実装パターン

```typescript
// src/stores/__tests__/memo.test.ts
import { describe, it, expect } from 'vitest'
import { useMemoStore } from '../memo'

describe('useMemoStore', () => {
  // ① 初期状態の確認
  it('初期状態ではメモが空', () => {
    const store = useMemoStore()  // setup.ts で毎回 Pinia が初期化される
    expect(store.getMemo(1)).toBe('')
    //                       ^^^^
    //   toBe: プリミティブ値の比較（文字列・数値・boolean）
  })

  // ② 操作後の状態確認
  it('setMemo でメモを保存できる', () => {
    const store = useMemoStore()
    store.setMemo(1, 'テストメモ')        // 操作
    expect(store.getMemo(1)).toBe('テストメモ')  // 結果を検証
  })

  // ③ 境界値: 空白のみは「なし」扱い
  it('hasMemo: 空白のみのメモは false', () => {
    const store = useMemoStore()
    store.setMemo(3, '   ')
    expect(store.hasMemo(3)).toBe(false)
  })

  // ④ 独立性: 異なる ID は影響しない
  it('商品ごとに独立して管理される', () => {
    const store = useMemoStore()
    store.setMemo(1, '商品1のメモ')
    store.setMemo(2, '商品2のメモ')
    expect(store.getMemo(1)).toBe('商品1のメモ')
    expect(store.getMemo(2)).toBe('商品2のメモ')
  })
})
```

### Store テストの注意点

```typescript
// ✅ 各テストで useMemoStore() を呼ぶ（beforeEach で初期化済みの Pinia を使う）
it('テスト', () => {
  const store = useMemoStore()
  // ...
})

// ❌ describe の外で store を作ると初期化前に呼ばれてエラーになる
const store = useMemoStore()  // ← Pinia が初期化される前に呼ばれる
describe('...', () => { ... })
```

---

## パターン3: UIコンポーネントのテスト

**対象**: `src/components/search/SearchConditionChips.vue`
**特徴**: props を渡してレンダリング結果（テキスト・DOM）を検証する。

### ソース

```vue
<!-- SearchConditionChips.vue -->
<template>
  <div>
    <v-chip v-if="q">{{ q }}</v-chip>
    <v-chip v-if="category">{{ category }}</v-chip>
    <v-chip v-if="inStock">在庫あり</v-chip>
    <span v-if="!q && !category && !inStock">条件なし（全件）</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ q?: string; category?: string; inStock?: boolean; closable?: boolean }>()
</script>
```

### テスト実装パターン

```typescript
// src/components/search/__tests__/SearchConditionChips.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchConditionChips from '../SearchConditionChips.vue'

describe('SearchConditionChips', () => {
  // ① props なし（デフォルト状態）
  it('条件なしの場合「条件なし（全件）」を表示', () => {
    const wrapper = mount(SearchConditionChips)
    //                    ^^^^^^^^^^^^^^^^^^^
    //   props なしで mount すると全 props が undefined/false になる
    expect(wrapper.text()).toContain('条件なし（全件）')
    //     ^^^^^^^^^^^^^^
    //   .text() でレンダリングされたテキスト全体を取得
  })

  // ② props ありで表示されること
  it('q を渡すとキーワードチップを表示', () => {
    const wrapper = mount(SearchConditionChips, {
      props: { q: '緑茶' },  // ← props を渡す
    })
    expect(wrapper.text()).toContain('緑茶')
    expect(wrapper.text()).not.toContain('条件なし')  // ← 非表示も確認
  })

  // ③ 複数 props の組み合わせ
  it('複数条件を同時に表示できる', () => {
    const wrapper = mount(SearchConditionChips, {
      props: { q: '緑茶', category: '食品', inStock: true },
    })
    expect(wrapper.text()).toContain('緑茶')
    expect(wrapper.text()).toContain('食品')
    expect(wrapper.text()).toContain('在庫あり')
  })

  // ④ DOM の存在確認
  it('closable=false のとき閉じるボタンが非表示', () => {
    const wrapper = mount(SearchConditionChips, {
      props: { q: '緑茶', closable: false },
    })
    expect(wrapper.find('.v-chip__close').exists()).toBe(false)
    //                   ^^^^^^^^^^^^^^
    //   CSS セレクタで要素を検索。exists() で存在確認
  })
})
```

### よく使う wrapper メソッド

```typescript
wrapper.text()                    // テキスト全体を文字列で取得
wrapper.html()                    // HTML 全体を文字列で取得
wrapper.find('.class')            // 最初の1要素を取得（DOMWrapper）
wrapper.findAll('button')         // 全要素を配列で取得
wrapper.find('.class').exists()   // 要素が存在するか
wrapper.find('input').element.value  // input の値
wrapper.emitted('click')          // 発火したイベントの記録
wrapper.emitted('update:modelValue')?.[0]  // 最初の発火の引数
```

---

## パターン4: ダイアログコンポーネントのテスト

**対象**: `src/components/search/ProductFilterDialog.vue`
**特徴**: `v-dialog` は `<body>` に teleport されるため、`attachTo: document.body` が必須。

### なぜ `attachTo: document.body` が必要か

```
通常の mount:
  wrapper の DOM ツリーにコンポーネントが描画される
  v-dialog は <body> に teleport されるが、テスト環境では <body> が独立している
  → document.body.textContent でダイアログの中身が見えない

attachTo: document.body を指定:
  コンポーネント自体を <body> に append する
  teleport 先の <body> と同じ場所になる
  → document.body.textContent でダイアログの中身が見える
```

### テスト実装パターン

```typescript
// src/components/search/__tests__/ProductFilterDialog.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductFilterDialog, { CATEGORIES } from '../ProductFilterDialog.vue'

// props のベースをまとめておく
const defaultProps = {
  modelValue: true,
  category: '' as const,
  inStock: false,
}

describe('ProductFilterDialog', () => {
  // ① ダイアログが表示されているか
  it('modelValue=true のときダイアログが表示される', () => {
    const wrapper = mount(ProductFilterDialog, {
      props: defaultProps,
      attachTo: document.body,  // ← teleport のために必須
    })
    // wrapper.text() ではなく document.body.textContent で確認
    expect(document.body.textContent).toContain('絞り込み条件')
    wrapper.unmount()  // ← attachTo を使った場合は必ず unmount する
  })

  // ② エクスポートされた定数を使って網羅的に確認
  it('全カテゴリが選択肢として表示される', () => {
    const wrapper = mount(ProductFilterDialog, {
      props: defaultProps,
      attachTo: document.body,
    })
    for (const cat of CATEGORIES) {
      expect(document.body.textContent).toContain(cat)
    }
    wrapper.unmount()
  })

  // ③ ボタンクリックで emit を確認
  it('リセットボタンクリックで reset イベントを発火', async () => {
    const wrapper = mount(ProductFilterDialog, {
      props: defaultProps,
      attachTo: document.body,
    })
    // document.body からボタンを検索（teleport 先にある）
    const buttons = document.body.querySelectorAll('button')
    const resetBtn = Array.from(buttons).find(b => b.textContent?.includes('リセット'))
    resetBtn?.click()
    await wrapper.vm.$nextTick()   // DOM 更新を待つ
    expect(wrapper.emitted('reset')).toBeTruthy()
    wrapper.unmount()
  })

  // ④ emit の引数を確認
  it('閉じるボタンクリックで update:modelValue=false を発火', async () => {
    const wrapper = mount(ProductFilterDialog, {
      props: defaultProps,
      attachTo: document.body,
    })
    const buttons = document.body.querySelectorAll('button')
    const closeBtn = Array.from(buttons).find(b => b.textContent?.includes('閉じる'))
    closeBtn?.click()
    await wrapper.vm.$nextTick()
    // [0] は「最初に発火したイベント」の引数配列
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    wrapper.unmount()
  })
})
```

### attachTo 使用時の注意

```typescript
// ❌ unmount しないとテスト間で DOM が残留して干渉する
it('テスト', () => {
  const wrapper = mount(Component, { attachTo: document.body })
  // ... unmount 忘れ
})

// ✅ 必ず unmount する
it('テスト', () => {
  const wrapper = mount(Component, { attachTo: document.body })
  // テスト内容
  wrapper.unmount()
})

// ✅ afterEach でまとめて unmount する方法
let wrapper: ReturnType<typeof mount>
afterEach(() => wrapper.unmount())
it('テスト', () => {
  wrapper = mount(Component, { attachTo: document.body })
  // ...
})
```

---

## パターン5: ページコンポーネントのテスト（ルーター・モックあり）

**対象**: `src/pages/SearchPage.vue`
**特徴**: `useRouter().push` をスパイして画面遷移を検証する。

### ソース（抜粋）

```typescript
// SearchPage.vue
const router = useRouter()
const keyword = ref('')

function search() {
  const query = buildSearchQuery(keyword.value, selectedCategory.value, inStockOnly.value)
  router.push({ path: '/products', query })
}
```

### テスト実装パターン

```typescript
// src/pages/__tests__/SearchPage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SearchPage from '../SearchPage.vue'

// ① vi.mock でモジュール全体を差し替える
const mockPush = vi.fn()  // push の呼び出しを記録するスパイ

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,                                        // 元の実装を保持
    useRouter: () => ({ push: mockPush, back: vi.fn() }),  // push だけ差し替え
    useRoute: () => ({ path: '/search', query: {} }),      // 固定値を返す
  }
})

// ② MainLayout の v-bottom-navigation がナビゲーションを描画するため
//    最小限のルーターが必要
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/search', component: { template: '<div />' } },
      { path: '/products', component: { template: '<div />' } },
      { path: '/scanner', component: { template: '<div />' } },
    ],
  })
}

describe('SearchPage', () => {
  beforeEach(() => {
    mockPush.mockClear()  // 各テスト前にスパイの記録をリセット
  })

  it('キーワードで検索すると /products に push', async () => {
    const wrapper = mount(SearchPage, {
      global: { plugins: [makeRouter()] },  // ルーターを渡す
      attachTo: document.body,
    })

    // input に値を入力
    await wrapper.find('input').setValue('緑茶')

    // フッターボタンをクリック
    const searchBtn = Array.from(document.body.querySelectorAll('button'))
      .find(b => b.textContent?.includes('検索'))
    searchBtn?.click()
    await flushPromises()  // 非同期処理が完了するまで待つ

    // push が正しい引数で呼ばれたか
    expect(mockPush).toHaveBeenCalledWith({
      path: '/products',
      query: { q: '緑茶' },
    })
    wrapper.unmount()
  })
})
```

### vi.mock のパターン

```typescript
// ① モジュール全体を差し替え
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} }),
}))

// ② 元の実装を保持しつつ一部だけ差し替え（推奨）
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push: vi.fn() }) }
})

// ③ 関数の戻り値をスパイ
const mockFn = vi.fn().mockReturnValue('固定値')
const mockAsyncFn = vi.fn().mockResolvedValue({ data: [] })

// ④ スパイの検証
expect(mockPush).toHaveBeenCalled()                     // 1回以上呼ばれた
expect(mockPush).toHaveBeenCalledTimes(1)               // ちょうど1回
expect(mockPush).toHaveBeenCalledWith('/products')      // 引数を確認
expect(mockPush).toHaveBeenLastCalledWith('/products')  // 最後の呼び出し
```

---

## パターン6: useAsync を使うコンポーネントのテスト

**対象**: `src/pages/ProductListPage.vue`
**特徴**: `getProductsAPI` を vi.mock で差し替えて API 呼び出しをシミュレートする。

### テスト実装パターン

```typescript
// src/pages/__tests__/ProductListPage.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ProductListPage from '../ProductListPage.vue'
import type { ProductListResponse } from '@/api/products'

// ① API 関数をモック
const mockGetProducts = vi.fn()

vi.mock('@/api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/products')>()
  return {
    ...actual,
    getProductsAPI: () => ({
      getProducts: mockGetProducts,
    }),
  }
})

// ② ルーターのモック
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useRoute: () => ({ query: { q: '緑茶' } }),
  }
})

// ③ フィクスチャデータ
const mockResponse: ProductListResponse = {
  items: [
    { id: 1, name: 'オーガニック緑茶', category: '食品',
      price: 1200, inStock: true, description: '緑茶', rating: 4, reviews: [] },
  ],
  total: 1, page: 1, pageSize: 5, totalPages: 1,
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/products', component: { template: '<div />' } }],
  })
}

describe('ProductListPage', () => {
  it('取得した商品名が一覧に表示される', async () => {
    // モックに解決値を設定
    mockGetProducts.mockResolvedValue(mockResponse)

    const wrapper = mount(ProductListPage, {
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })

    await flushPromises()  // useAsync の非同期処理を完了させる

    expect(document.body.textContent).toContain('オーガニック緑茶')
    wrapper.unmount()
  })

  it('API エラー時はモックデータを表示する', async () => {
    // エラーを返すモック
    mockGetProducts.mockRejectedValue(new Error('Network Error'))

    const wrapper = mount(ProductListPage, {
      global: { plugins: [makeRouter()] },
      attachTo: document.body,
    })

    await flushPromises()

    // フォールバックのオフライン通知が表示される
    expect(document.body.textContent).toContain('オフラインモード')
    wrapper.unmount()
  })
})
```

---

## よく使う Vitest API 早見表

### アサーション

```typescript
// 等値・同一
expect(value).toBe(42)                  // プリミティブの厳密比較（===）
expect(obj).toEqual({ a: 1 })           // オブジェクトの中身を比較
expect(obj).toStrictEqual({ a: 1 })     // undefined なプロパティも比較

// 真偽
expect(value).toBeTruthy()              // truthy（null/0/''以外）
expect(value).toBeFalsy()               // falsy
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

// 数値
expect(num).toBeGreaterThan(0)
expect(num).toBeLessThanOrEqual(100)
expect(num).toBeCloseTo(3.14, 2)        // 小数の近似比較

// 文字列・配列
expect(str).toContain('部分文字列')
expect(arr).toContain(item)
expect(arr).toHaveLength(3)
expect(arr).toEqual(expect.arrayContaining([1, 2]))  // 順不同で含む

// 例外
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('エラーメッセージ')

// 非同期
await expect(asyncFn()).resolves.toBe(42)
await expect(asyncFn()).rejects.toThrow()

// 否定
expect(value).not.toBe(0)
expect(wrapper.text()).not.toContain('エラー')
```

### スパイ・モック

```typescript
// 関数スパイ
const spy = vi.fn()
const spy = vi.fn().mockReturnValue('固定値')
const spy = vi.fn().mockResolvedValue({ data: [] })    // Promise.resolve
const spy = vi.fn().mockRejectedValue(new Error())     // Promise.reject
const spy = vi.fn().mockImplementation((x) => x * 2)  // 実装を差し替え

// 検証
expect(spy).toHaveBeenCalled()
expect(spy).toHaveBeenCalledTimes(2)
expect(spy).toHaveBeenCalledWith('引数1', '引数2')
expect(spy).toHaveBeenNthCalledWith(1, '最初の呼び出し引数')
expect(spy).toHaveReturnedWith('戻り値')

// リセット
spy.mockClear()   // 呼び出し記録だけリセット（実装は保持）
spy.mockReset()   // 記録 + 実装をリセット
spy.mockRestore() // vi.spyOn で作ったスパイを元に戻す

// モジュールモック
vi.mock('./module')
vi.mock('./module', () => ({ fn: vi.fn() }))
vi.mock('./module', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, fn: vi.fn() }
})
```

### 非同期

```typescript
import { flushPromises } from '@vue/test-utils'

// Promise キューを全部解決させる（useAsync の完了を待つ）
await flushPromises()

// DOM 更新を1サイクル待つ
await wrapper.vm.$nextTick()

// タイマー制御
vi.useFakeTimers()
vi.advanceTimersByTime(1000)  // 1秒進める
vi.useRealTimers()
```

---

## テスト設計の考え方

### テスト対象の絞り方

```
ソースを見て「何が変わると出力が変わるか」を列挙する

buildSearchQuery(keyword, category, inStock)
  ↓ 変わりうるもの
  keyword: 空 / 値あり / 空白のみ（境界値）
  category: 空 / 値あり
  inStock: false / true
  ↓ 組み合わせ
  デシジョンテーブルで8〜9ケース
```

### テストケースの命名規則

```typescript
// ✅ 「条件 → 期待する結果」の形式で書く
it('keyword が空のとき q を含まない', ...)
it('inStock=true のとき在庫ありチップを表示', ...)
it('リセットボタンクリックで reset イベントを発火', ...)

// ❌ 何をテストしているか不明
it('テスト1', ...)
it('正常系', ...)
```

### 1テストに1アサーション（原則）

```typescript
// ❌ 1つのテストに複数の検証を詰め込む
it('検索結果ページ', () => {
  expect(wrapper.text()).toContain('緑茶')
  expect(wrapper.text()).toContain('食品')
  expect(mockPush).toHaveBeenCalled()
  expect(wrapper.find('.v-chip').exists()).toBe(true)
})

// ✅ 1つの振る舞いを1テストで確認
it('検索結果に商品名が表示される', () => {
  expect(wrapper.text()).toContain('緑茶')
})
it('検索結果にカテゴリチップが表示される', () => {
  expect(wrapper.text()).toContain('食品')
})
```

---

## コマンド一覧

```bash
# ウォッチモード（開発中はこれ）
npm run test

# 1回実行して結果を表示
npm run test:run

# UI 付きでブラウザ確認
npm run test:ui

# HTML レポートを生成して開く
npm run test:report

# カバレッジ計測
npm run test:coverage

# カバレッジを HTML で開く
npm run test:coverage:open

# 特定のファイルだけ実行
npx vitest run src/utils/__tests__/searchUtils.test.ts

# テスト名でフィルタ
npx vitest run --reporter=verbose -t "buildSearchQuery"
```

---

## このプロジェクト固有の注意点

### 1. menuStore の自動フェッチ

`useMainMenuStore`（`src/stores/menu.ts`）はストア初期化時に `fetchMenu()` を自動実行する。
`MainMenuPage` をマウントすると即座に API コールが走るため、`vi.mock('@/api/index')` が必須。

> **注記（現行との差分）**: 現在はページから `@/api` を直接使わないため、composable を `vi.mock` する方式が現行
> （[docs/guides/team-guide.md §テスト](../guides/team-guide.md#5-テストの書き方) 参照）。

```ts
// MainMenuPage をテストする場合は必ず API をモック
vi.mock('@/api/index', () => ({
  getAppAPI: () => ({
    getMenu: vi.fn().mockResolvedValue([]),
  }),
}))
```

モックなしでマウントすると実際の axios 呼び出しが発生し、ネットワークエラーや
フォールバック処理が走ってテスト結果が不安定になる。

---

### 2. useAsync の isLoading 初期値は true

`useAsync`（`src/composables/useAsync.ts`）は `isLoading = ref(true)` で初期化される。
`flushPromises()` を呼ぶ前の時点では必ずローディング中となる。

```ts
// ✅ isLoading は最初から true
const wrapper = mount(ProductListPage, { ... })
expect(wrapper.find('.v-progress-linear').exists()).toBe(true) // ローディング中

await flushPromises()
expect(wrapper.find('.v-progress-linear').exists()).toBe(false) // 完了後
```

旧来の `isLoading = ref(false)` を前提としたテストは書き直しが必要。

---

### 3. SearchPage: makeRouter に全ナビゲーションルートを定義する

`SearchPage` は `MainLayout` を使い、`v-bottom-navigation` 内で `<RouterLink>` が描画される。
定義されていないパスへのリンクがあると Vue Router が警告を出し、テストが不安定になる。

```ts
// ✅ ナビゲーションタブが使うルートをすべて定義する
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/',        component: { template: '<div />' } },
      { path: '/menu',    component: { template: '<div />' } },
      { path: '/search',  component: { template: '<div />' } },
      { path: '/products', component: { template: '<div />' } },
      { path: '/scanner', component: { template: '<div />' } },
    ],
  })
}
```

---

### 4. SearchPage: フッターボタンは document.body から探す

`v-bottom-navigation` は teleport により `<body>` 直下に描画される。
`wrapper.findAll('button')` ではフッター内のボタンが見つからない場合がある。

```ts
// ❌ wrapper 内を探しても見つからない場合がある
const btn = wrapper.findAll('button').find(b => b.text().includes('検索'))

// ✅ document.body から探す
const btn = Array.from(document.body.querySelectorAll('button'))
  .find(b => b.textContent?.includes('検索'))
btn?.click()
await flushPromises()
```

同様に `v-dialog`・`v-bottom-sheet` も teleport されるため、
中身の確認は `document.body.textContent` で行う（パターン4 参照）。

---

### 5. attachTo: document.body 使用時は必ず unmount

teleport を使うコンポーネントで `attachTo: document.body` を指定した場合、
`wrapper.unmount()` を忘れると DOM が次のテストに残留して干渉する。

```ts
// ✅ afterEach でまとめて unmount する
let wrapper: ReturnType<typeof mount>
afterEach(() => wrapper?.unmount())

it('テスト', () => {
  wrapper = mount(Component, { attachTo: document.body })
  // ...
})

// ✅ または各テスト末尾で呼ぶ
it('テスト', () => {
  const wrapper = mount(Component, { attachTo: document.body })
  // ...
  wrapper.unmount()
})
```

---

### 6. Pinia Store はテスト関数の中で呼ぶ

`src/test/setup.ts` の `beforeEach` で `setActivePinia(createPinia())` が実行される。
`describe` 直下（テスト関数の外）で Store を呼ぶと Pinia 未初期化エラーになる。

```ts
// ✅ テスト関数の中で呼ぶ
it('テスト', () => {
  const store = useMemoStore()
  store.setMemo(1, 'memo')
  expect(store.hasMemo(1)).toBe(true)
})

// ❌ describe の直下で呼ぶ（Pinia 未初期化でエラー）
const store = useMemoStore() // Error: getActivePinia was called with no active Pinia
describe('...', () => { ... })
```
