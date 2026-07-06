# Vitest リファレンス

## プロジェクト設定

```ts
// vite.config.mts の test セクション（抜粋）
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['src/test/setup.ts'],
}
```

```ts
// src/test/setup.ts で全テスト共通のセットアップ
import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach } from 'vitest'

// Vuetify をグローバルに登録（全テストで mount 時に使える）
const vuetify = createVuetify({ components, directives })
config.global.plugins = [vuetify]

// Pinia を各テスト前にリセット（store の状態が漏れないようにする）
beforeEach(() => {
  setActivePinia(createPinia())
})
```

---

## 基本構造

```ts
import { describe, it, expect } from 'vitest'

describe('グループ名', () => {
  it('テスト名', () => {
    expect(actual).toBe(expected)
  })
})
```

### ネスト

```ts
describe('buildSearchQuery', () => {
  describe('キーワードのみ', () => {
    it('q が含まれる', () => { ... })
    it('category は含まれない', () => { ... })
  })
  describe('全条件あり', () => {
    it('q, category, inStock がすべて含まれる', () => { ... })
  })
})
```

---

## アサーション（expect）

### 値の比較

```ts
expect(value).toBe(42)              // 厳密等価 (===)
expect(value).toEqual({ a: 1 })    // 深い比較（オブジェクト・配列）
expect(value).not.toBe(null)        // 否定

expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeTruthy()          // truthy (0, '', null 以外)
expect(value).toBeFalsy()
```

### 数値

```ts
expect(n).toBeGreaterThan(0)
expect(n).toBeGreaterThanOrEqual(1)
expect(n).toBeLessThan(100)
expect(n).toBeCloseTo(0.1 + 0.2, 5)  // 浮動小数点
```

### 文字列

```ts
expect(str).toContain('キーワード')
expect(str).toMatch(/^[0-9]+$/)     // 正規表現
expect(str).toHaveLength(5)
```

### 配列

```ts
expect(arr).toHaveLength(3)
expect(arr).toContain('食品')
expect(arr).toEqual(['a', 'b', 'c'])
expect(arr).toMatchObject([{ id: 1 }, { id: 2 }])  // 部分一致
```

### オブジェクト

```ts
expect(obj).toMatchObject({ name: '緑茶' })   // 指定キーのみ確認
expect(obj).toHaveProperty('category', '食品')
```

### 例外

```ts
expect(() => riskyFn()).toThrow()
expect(() => riskyFn()).toThrow('エラーメッセージ')
expect(() => riskyFn()).toThrow(TypeError)

// 非同期
await expect(asyncFn()).rejects.toThrow('エラー')
await expect(asyncFn()).resolves.toBe('ok')
```

---

## ライフサイクルフック

```ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

beforeAll(() => {
  // describe グループ全体で1回だけ（DB接続など）
})

afterAll(() => {
  // グループ終了後に1回
})

beforeEach(() => {
  // 各テスト前（モックのリセット、Pinia 初期化など）
  setActivePinia(createPinia())
})

afterEach(() => {
  // 各テスト後（クリーンアップ）
  localStorage.clear()
})
```

---

## モック（vi）

### 関数モック

```ts
import { vi } from 'vitest'

const mockFn = vi.fn()
mockFn('arg')

expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg')
expect(mockFn).toHaveBeenCalledTimes(1)

// 戻り値を設定
const mockFn = vi.fn().mockReturnValue('固定値')
const mockFn = vi.fn().mockResolvedValue({ items: [] })  // Promise
const mockFn = vi.fn().mockRejectedValue(new Error('失敗'))

// 1回だけ違う値を返す
mockFn.mockReturnValueOnce('最初だけ')
mockFn.mockResolvedValueOnce({ items: [] })

// テスト後にリセット
mockFn.mockClear()    // 呼び出し履歴のみクリア
mockFn.mockReset()    // 履歴 + 戻り値もリセット
```

### モジュールモック

```ts
// モジュール全体をモック
vi.mock('@/api/index', () => ({
  getAppAPI: () => ({
    getMenu: vi.fn().mockResolvedValue([
      { id: 'order', label: '受注管理', icon: 'mdi-list', children: [] },
    ]),
    getProducts: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5, totalPages: 1 }),
  }),
}))

// 一部だけモック（残りは実装を使う）
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useRoute: () => ({ path: '/search', query: {} }),
  }
})
```

### スパイ（既存関数を監視）

```ts
import { vi, expect } from 'vitest'

const obj = { method: () => 'original' }
const spy = vi.spyOn(obj, 'method')

obj.method()

expect(spy).toHaveBeenCalled()

// 実装を差し替える
spy.mockReturnValue('mocked')
spy.mockRestore()  // 元の実装に戻す
```

### タイマーモック

```ts
vi.useFakeTimers()

setTimeout(() => result = 'done', 1000)
vi.advanceTimersByTime(1000)

expect(result).toBe('done')

vi.useRealTimers()  // 元に戻す
```

---

## 非同期テスト

```ts
import { flushPromises } from '@vue/test-utils'

it('非同期処理の完了を待つ', async () => {
  const store = useProductStore()
  await store.fetchProducts()             // async action を await
  expect(store.items).toHaveLength(5)
})

it('DOM 更新を待つ', async () => {
  const wrapper = mount(MyComponent)
  await wrapper.vm.$nextTick()           // Vue の DOM 更新を待つ
  expect(wrapper.text()).toContain('更新後')
})

it('全 Promise を解決させる', async () => {
  wrapper.find('button').trigger('click')
  await flushPromises()                  // キューの全 Promise を解決
  expect(mockPush).toHaveBeenCalled()
})
```

---

## Vue Test Utils（コンポーネントテスト）

### mount / unmount

```ts
import { mount } from '@vue/test-utils'
import MyComponent from '../MyComponent.vue'

const wrapper = mount(MyComponent, {
  props: { label: 'テスト', modelValue: '' },
  attachTo: document.body,       // Vuetify テレポート対策（ダイアログ等）
  global: {
    plugins: [router, pinia],    // 必要なプラグイン
    stubs: { MyChild: true },    // 子コンポーネントをスタブ化
  },
})

// テスト後に必ず unmount（document.body に残らないよう）
wrapper.unmount()
```

### 要素の取得

```ts
wrapper.find('input')                    // CSS セレクタ
wrapper.find('[data-testid="btn"]')      // data-testid 推奨
wrapper.findAll('button')               // 複数取得
wrapper.findComponent(MyChild)          // コンポーネント

// Vuetify はテレポートで body に描画するため wrapper では見つからない
const btn = document.body.querySelector('button')
const btns = Array.from(document.body.querySelectorAll('button'))
  .find(b => b.textContent?.includes('検索'))
```

### DOM 確認

```ts
expect(wrapper.text()).toContain('ラベル')        // テキスト内容
expect(wrapper.html()).toContain('class="foo"')   // HTML
expect(wrapper.find('input').element.value).toBe('緑茶')

expect(wrapper.find('.v-btn').exists()).toBe(true)
expect(wrapper.find('.hidden').exists()).toBe(false)

// Vuetify ダイアログは body で確認
expect(document.body.textContent).toContain('絞り込み条件')
```

### ユーザー操作

```ts
await wrapper.find('input').setValue('緑茶')   // 値を入力
await wrapper.find('button').trigger('click')  // クリック
await wrapper.find('form').trigger('submit')

// body 経由でクリック
const btn = document.body.querySelector('button')
btn?.click()
await wrapper.vm.$nextTick()
```

### emit の確認

```ts
await wrapper.find('button').trigger('click')

// emitted() は { イベント名: [[引数], [引数], ...] } の形
expect(wrapper.emitted('update:modelValue')).toBeTruthy()
expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['新しい値'])
expect(wrapper.emitted('reset')?.[0]).toEqual([])  // 引数なし
```

### props の動的変更

```ts
const wrapper = mount(MyComponent, { props: { modelValue: 'a' } })
await wrapper.setProps({ modelValue: 'b' })
expect(wrapper.text()).toContain('b')
```

---

## Pinia store のテスト

```ts
import { setActivePinia, createPinia } from 'pinia'
import { useMemoStore } from '../memo'

// setup.ts で beforeEach に書いているので省略可。
// 明示したい場合はここに書く。
beforeEach(() => {
  setActivePinia(createPinia())
})

it('setMemo でメモが保存される', () => {
  const store = useMemoStore()
  store.setMemo(1, 'テストメモ')
  expect(store.getMemo(1)).toBe('テストメモ')
})

it('API 成功時に items が更新される', async () => {
  const store = useMainMenuStore()
  await store.fetchMenu()
  expect(store.items.length).toBeGreaterThan(0)
  expect(store.isError).toBe(false)
})

// persist store のテスト（localStorage を使う）
afterEach(() => {
  localStorage.clear()
})
```

---

## よく使うパターン集

### パターン 1：純粋関数テスト（デシジョンテーブル）

```ts
describe('buildSearchQuery', () => {
  // 条件の組み合わせを表で整理してからテストを書く
  // | keyword | category | inStock | 期待 |
  // |   空    |   空     |  false  | {}  |
  // | あり    |   空     |  false  | {q} |

  it('[BQ-1] すべて空 → {}', () => {
    expect(buildSearchQuery('', '', false)).toEqual({})
  })
  it('[BQ-2] keyword のみ → {q}', () => {
    expect(buildSearchQuery('緑茶', '', false)).toEqual({ q: '緑茶' })
  })
  it('[BQ-9] 空白のみは空扱い（境界値）', () => {
    expect(buildSearchQuery('   ', '', false)).toEqual({})
  })
})
```

### パターン 2：コンポーネントの props → 表示

```ts
describe('SearchConditionChips', () => {
  it('条件なし → 「条件なし（全件）」を表示', () => {
    const wrapper = mount(SearchConditionChips)
    expect(wrapper.text()).toContain('条件なし（全件）')
  })

  it('q あり → キーワードチップを表示', () => {
    const wrapper = mount(SearchConditionChips, { props: { q: '緑茶' } })
    expect(wrapper.text()).toContain('緑茶')
    expect(wrapper.text()).not.toContain('条件なし')
  })
})
```

### パターン 3：ボタンクリック → emit

```ts
it('リセットボタンで reset が発火', async () => {
  const wrapper = mount(ProductFilterDialog, {
    props: { modelValue: true, category: '', inStock: false },
    attachTo: document.body,
  })
  const btn = Array.from(document.body.querySelectorAll('button'))
    .find(b => b.textContent?.includes('リセット'))
  btn?.click()
  await wrapper.vm.$nextTick()
  expect(wrapper.emitted('reset')).toBeTruthy()
  wrapper.unmount()
})
```

### パターン 4：ページ + vue-router モック

```ts
const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({ push: mockPush, back: vi.fn() }),
    useRoute: () => ({ path: '/search', query: {} }),
  }
})

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
}

it('検索ボタンで /products に push', async () => {
  const wrapper = mount(SearchPage, {
    global: { plugins: [makeRouter()] },
    attachTo: document.body,
  })
  await wrapper.find('input').setValue('緑茶')
  document.body.querySelector('[data-action="search"]')?.click()
  await flushPromises()
  expect(mockPush).toHaveBeenCalledWith({ path: '/products', query: { q: '緑茶' } })
  wrapper.unmount()
})
```

### パターン 5：store + API モック

```ts
vi.mock('@/api/index', () => ({
  getAppAPI: () => ({
    getMenu: vi.fn().mockResolvedValue([
      { id: 'order', label: '受注管理', icon: 'mdi-list', children: [] },
    ]),
  }),
}))

it('fetchMenu で items が更新される', async () => {
  const store = useMainMenuStore()
  await store.fetchMenu()
  expect(store.items).toHaveLength(1)
  expect(store.isLoading).toBe(false)
})
```

### パターン 6：API 失敗 → フォールバック

```ts
vi.mock('@/api/index', () => ({
  getAppAPI: () => ({
    getMenu: vi.fn().mockRejectedValue(new Error('Network Error')),
  }),
}))

it('fetchMenu 失敗時はフォールバックデータを使う', async () => {
  const store = useMainMenuStore()
  await store.fetchMenu()
  expect(store.isError).toBe(true)
  expect(store.items.length).toBeGreaterThan(0)  // JSON フォールバック
})
```

---

## コマンド

```bash
npx vitest              # ウォッチモード（開発中）
npx vitest run          # 1回実行して終了
npx vitest run --reporter=verbose   # テスト名を全表示

# 特定ファイル
npx vitest run src/utils/__tests__/searchUtils.test.ts

# カバレッジ
npx vitest run --coverage
```
