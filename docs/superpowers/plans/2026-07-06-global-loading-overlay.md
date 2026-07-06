# グローバルローディングオーバーレイ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ページ遷移・API 通信中に全画面ローディング(グルグル)を自動表示する仕組みと、その動作確認用サンプルページを作る。

**Architecture:** AppSnackbar / useSnackbar で確立済みの「モジュールスコープ state + composable + App.vue 常駐コンポーネント」パターンに従う。`useGlobalLoading` が vue-query の `useIsFetching` / `useIsMutating` とルーター遷移フラグを合成し、`AppLoadingOverlay`(v-overlay)がそれを表示する。手動 show/hide API は設けない(すべて状態の観測なので消し忘れが構造的に発生しない)。

**Tech Stack:** Vue 3.5 (`<script setup>`) / Vuetify 4 / @tanstack/vue-query v5 / vue-router 5 / Vitest 4 + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-07-06-global-loading-overlay-design.md`

## Global Constraints

- コメント・UI 文言は日本語(既存コードのスタイルに合わせる)
- 手動 show/hide API は作らない(スペックでスコープ外)
- 既存のページ内ローディング表示(StockSearchPage の v-progress-linear 等)は変更しない
- チラつき対策(遅延表示・最低表示時間)は入れない(要件で「即時表示」を選択)
- グルグルの DOM には `data-testid="global-loading"` を付与
- テストファイル冒頭に既存テストと同形式のヘッダーコメント(テスト対象・種別・テストケース一覧)を書く
- テスト実行は `npx vitest run <パス>`、全体確認は `npm run test:run` / `npm run type-check`
- vue-query の `useIsFetching` / `useIsMutating` / `useQuery` は setup() 内でしか呼べない。テストでは `VueQueryPlugin` が `src/test/setup.ts` により登録済みなので、コンポーネントに mount して composable を実行する

---

### Task 1: useGlobalLoading composable

**Files:**
- Create: `src/composables/useGlobalLoading.ts`
- Test: `src/composables/__tests__/useGlobalLoading.test.ts`(`__tests__` ディレクトリは新規作成)

**Interfaces:**
- Consumes: `@tanstack/vue-query` の `useIsFetching` / `useIsMutating`
- Produces(後続タスクが依存):
  - `useGlobalLoading(): { isLoading: ComputedRef<boolean> }` — Task 2 の AppLoadingOverlay が使用
  - `startNavigation(): void` / `endNavigation(): void` — Task 3 の router ガードが使用
  - クエリ除外規約: `meta: { globalLoading: false }` を付けた useQuery はグルグル対象外

- [ ] **Step 1: 失敗するテストを書く**

`src/composables/__tests__/useGlobalLoading.test.ts` を作成:

```ts
// ============================================================
// テスト対象: useGlobalLoading (src/composables/useGlobalLoading.ts)
// 種別: composable ユニットテスト
// ------------------------------------------------------------
// 全画面ローディング(グルグル)の表示状態を合成する composable。
// vue-query の実行中カウントとページ遷移フラグを観測するだけで、
// 手動 show/hide は存在しない。
// テストケース一覧
//   [1] クエリ実行中は isLoading=true、完了で false に戻る
//   [2] mutation 実行中は isLoading=true、完了で false に戻る
//   [3] startNavigation/endNavigation で isLoading が切り替わる
//   [4] meta.globalLoading=false のクエリは無視される
// ============================================================
import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useQuery, useMutation } from '@tanstack/vue-query'
import { useGlobalLoading, startNavigation, endNavigation } from '../useGlobalLoading'

/** composable を setup() 内で実行して戻り値を取り出すヘルパー */
function mountComposable<T>(composable: () => T): T {
  let result!: T
  mount(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    }),
  )
  return result
}

/** 手動で解決できる Promise(通信中の状態を任意のタイミングで終わらせる用) */
function deferred<T = unknown>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

afterEach(() => {
  // モジュールスコープの遷移フラグをテスト間でリセット
  endNavigation()
})

describe('useGlobalLoading', () => {
  it('クエリ実行中は isLoading が true になり、完了で false に戻る', async () => {
    const d = deferred<string>()
    const { isLoading } = mountComposable(() => {
      useQuery({ queryKey: ['gl-query'], queryFn: () => d.promise })
      return useGlobalLoading()
    })
    await vi.waitFor(() => expect(isLoading.value).toBe(true))
    d.resolve('done')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
  })

  it('mutation 実行中は isLoading が true になり、完了で false に戻る', async () => {
    const d = deferred<string>()
    const { isLoading, mutate } = mountComposable(() => {
      const mutation = useMutation({ mutationFn: () => d.promise })
      return { ...useGlobalLoading(), mutate: mutation.mutate }
    })
    expect(isLoading.value).toBe(false)
    mutate()
    await vi.waitFor(() => expect(isLoading.value).toBe(true))
    d.resolve('done')
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
  })

  it('startNavigation/endNavigation で isLoading が切り替わる', async () => {
    const { isLoading } = mountComposable(() => useGlobalLoading())
    expect(isLoading.value).toBe(false)
    startNavigation()
    await vi.waitFor(() => expect(isLoading.value).toBe(true))
    endNavigation()
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
  })

  it('meta.globalLoading=false のクエリは無視される', async () => {
    const d = deferred<string>()
    const { isLoading, isFetching } = mountComposable(() => {
      const query = useQuery({
        queryKey: ['gl-excluded'],
        queryFn: () => d.promise,
        meta: { globalLoading: false },
      })
      return { ...useGlobalLoading(), isFetching: query.isFetching }
    })
    // クエリ自体は実行中だが、グローバルローディングは反応しないこと
    await vi.waitFor(() => expect(isFetching.value).toBe(true))
    expect(isLoading.value).toBe(false)
    d.resolve('done')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/composables/__tests__/useGlobalLoading.test.ts`
Expected: FAIL(`Failed to resolve import "../useGlobalLoading"` — モジュール未作成のため)

- [ ] **Step 3: 最小実装を書く**

`src/composables/useGlobalLoading.ts` を作成:

```ts
import { computed, ref, type ComputedRef } from 'vue'
import { useIsFetching, useIsMutating } from '@tanstack/vue-query'

// ページ遷移中フラグ(モジュールスコープ: router ガードと全コンポーネントで共有)
const isNavigating = ref(false)

/** router.beforeEach から呼ぶ */
export function startNavigation() {
  isNavigating.value = true
}

/** router.afterEach / router.onError から呼ぶ */
export function endNavigation() {
  isNavigating.value = false
}

/**
 * 全画面ローディング(グルグル)の表示状態。
 * vue-query の通信中カウントとページ遷移中フラグを合成した読み取り専用の状態を返す。
 * 手動 show/hide は設けない(すべて状態の観測で決まるため、消し忘れが構造的に発生しない)。
 *
 * - グルグルを出したくないクエリには meta: { globalLoading: false } を付けると対象外になる
 * - useIsFetching/useIsMutating は QueryClient を inject するため、コンポーネントの setup 内から呼ぶこと
 */
export function useGlobalLoading(): { isLoading: ComputedRef<boolean> } {
  const fetching = useIsFetching({
    predicate: (query) => query.meta?.globalLoading !== false,
  })
  const mutating = useIsMutating()
  const isLoading = computed(
    () => isNavigating.value || fetching.value > 0 || mutating.value > 0,
  )
  return { isLoading }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/composables/__tests__/useGlobalLoading.test.ts`
Expected: PASS(4 tests)

- [ ] **Step 5: コミット**

```bash
git add src/composables/useGlobalLoading.ts src/composables/__tests__/useGlobalLoading.test.ts
git commit -m "feat: グローバルローディング状態を合成する useGlobalLoading を追加"
```

---

### Task 2: AppLoadingOverlay コンポーネント + App.vue 常駐

**Files:**
- Create: `src/components/ui/AppLoadingOverlay.vue`
- Modify: `src/App.vue`(template 5行目付近の `<AppSnackbar />` の隣に追加)
- Test: `src/components/ui/__tests__/AppLoadingOverlay.test.ts`

**Interfaces:**
- Consumes: Task 1 の `useGlobalLoading(): { isLoading: ComputedRef<boolean> }`、テストで `startNavigation()` / `endNavigation()`
- Produces: `data-testid="global-loading"` を持つ全画面オーバーレイ(E2E・手動確認の目印)

- [ ] **Step 1: 失敗するテストを書く**

`src/components/ui/__tests__/AppLoadingOverlay.test.ts` を作成。v-overlay はコンテンツを body 側に teleport するため、既存の BaseDialog テストと同じく `attachTo: document.body` + `document.querySelector` で検証する:

```ts
// ============================================================
// テスト対象: AppLoadingOverlay (src/components/ui/AppLoadingOverlay.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// useGlobalLoading の isLoading に応じて全画面グルグルを表示する常駐コンポーネント。
// テストケース一覧
//   [1] ローディングなし → グルグルが表示されない
//   [2] 遷移中フラグ ON → グルグルが表示され、OFF で消える
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppLoadingOverlay from '../AppLoadingOverlay.vue'
import { startNavigation, endNavigation } from '@/composables/useGlobalLoading'

const findSpinner = () => document.querySelector('[data-testid="global-loading"]')

describe('AppLoadingOverlay', () => {
  it('ローディングがないときはグルグルが表示されない', () => {
    const w = mount(AppLoadingOverlay, { attachTo: document.body })
    expect(findSpinner()).toBeNull()
    w.unmount()
  })

  it('遷移中フラグが ON の間だけグルグルが表示される', async () => {
    const w = mount(AppLoadingOverlay, { attachTo: document.body })
    startNavigation()
    await nextTick()
    expect(findSpinner()).not.toBeNull()
    endNavigation()
    // v-overlay は leave トランジション後に DOM から消えるため waitFor で待つ
    await vi.waitFor(() => expect(findSpinner()).toBeNull())
    w.unmount()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/components/ui/__tests__/AppLoadingOverlay.test.ts`
Expected: FAIL(`Failed to resolve import "../AppLoadingOverlay.vue"`)

- [ ] **Step 3: コンポーネントを実装**

`src/components/ui/AppLoadingOverlay.vue` を作成:

```vue
<template>
  <!--
    全画面ローディング(グルグル)。useGlobalLoading の観測結果を表示するだけで、
    このコンポーネント自身は表示/非表示を制御しない。
    - persistent + scrim: 表示中は背後の操作をブロック(二度押し防止を兼ねる)
    - contained: v-app(スマホ枠 430px)の内側だけを覆う(PC プレビューの灰色背景は覆わない)
    - z-index 3000: v-dialog(既定 2400)より手前に出す
  -->
  <v-overlay
    :model-value="isLoading"
    persistent
    contained
    no-click-animation
    :z-index="3000"
    class="align-center justify-center"
  >
    <v-progress-circular
      data-testid="global-loading"
      indeterminate
      color="primary"
      size="48"
    />
  </v-overlay>
</template>

<script setup lang="ts">
import { useGlobalLoading } from '@/composables/useGlobalLoading'
const { isLoading } = useGlobalLoading()
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/components/ui/__tests__/AppLoadingOverlay.test.ts`
Expected: PASS(2 tests)

- [ ] **Step 5: App.vue に常駐させる**

`src/App.vue` を修正。template:

```vue
<template>
  <div class="phone-wrapper">
    <v-app :theme="themeStore.currentTheme" class="phone-app">
      <router-view />
      <AppSnackbar />
      <AppLoadingOverlay />
    </v-app>
  </div>
</template>
```

script setup の import に追加:

```ts
import AppLoadingOverlay from '@/components/ui/AppLoadingOverlay.vue'
```

- [ ] **Step 6: 型チェックと全テスト**

Run: `npm run type-check`
Expected: エラーなし
Run: `npm run test:run`
Expected: 全テスト PASS(既存テストに影響がないこと)

- [ ] **Step 7: コミット**

```bash
git add src/components/ui/AppLoadingOverlay.vue src/components/ui/__tests__/AppLoadingOverlay.test.ts src/App.vue
git commit -m "feat: 全画面ローディングオーバーレイを App.vue に常駐"
```

---

### Task 3: ルーターガード連携

**Files:**
- Modify: `src/router/index.ts`(`export default router` の直前にガードを追加)

**Interfaces:**
- Consumes: Task 1 の `startNavigation()` / `endNavigation()`
- Produces: ページ遷移中に isNavigating=true になる挙動(ロジック自体は Task 1 でテスト済み。ここは配線のみ)

- [ ] **Step 1: ガードを追加**

`src/router/index.ts` の import に追加:

```ts
import { startNavigation, endNavigation } from '@/composables/useGlobalLoading'
```

`const router = createRouter({...})` の後、`export default router` の前に追加:

```ts
// ページ遷移中は全画面ローディングを表示する(AppLoadingOverlay が観測)
// 遷移失敗時も onError で必ず解除されるため消し忘れは起きない
router.beforeEach(() => {
  startNavigation()
})
router.afterEach(() => {
  endNavigation()
})
router.onError(() => {
  endNavigation()
})
```

- [ ] **Step 2: 型チェックと全テスト**

Run: `npm run type-check`
Expected: エラーなし
Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 3: コミット**

```bash
git add src/router/index.ts
git commit -m "feat: ページ遷移中にグローバルローディングを表示するルーターガードを追加"
```

---

### Task 4: 動作確認用サンプルページ(LoadingSamplePage)

**Files:**
- Create: `src/pages/LoadingSamplePage.vue`
- Modify: `src/router/index.ts`(`/sample-dialog` の次の行にルート追加)
- Modify: `src/stores/menuStore.ts`(`MENU_MASTER` の `sample-dialog` の次にメニュー項目追加)

**Interfaces:**
- Consumes: orval 生成の `getProducts(params?, options?, signal?)`(`@/api`)、vue-query の `useQuery` / `useMutation`
- Produces: `/sample-loading` ページ(手動確認用ツール。単体テストは書かない — ロジックは Task 1 でテスト済み)

- [ ] **Step 1: サンプルページを作成**

`src/pages/LoadingSamplePage.vue` を作成:

```vue
<template>
  <SubLayout title="ローディングサンプル">
    <v-container>
      <p class="text-body-2 mb-4">
        ボタンを押すと、処理中に全画面ローディング(グルグル)が自動で表示されることを確認できます。
      </p>
      <div class="d-flex flex-column ga-4">
        <v-btn color="primary" prepend-icon="mdi-download" @click="slowQuery.refetch()">
          遅い取得通信(2秒)
        </v-btn>
        <v-btn color="secondary" prepend-icon="mdi-upload" @click="slowMutation.mutate()">
          遅い更新通信(2秒)
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-arrow-right" to="/menu">
          ページ遷移(メインメニューへ)
        </v-btn>
        <p class="text-caption text-medium-emphasis mb-0">
          ※ ページ遷移は開発環境では一瞬で終わるため、グルグルを体感できない場合があります。
        </p>
      </div>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { useQuery, useMutation } from '@tanstack/vue-query'
import SubLayout from '@/components/layout/SubLayout.vue'
import { getProducts } from '@/api'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 遅い取得通信: 2秒待ってから orval 生成関数で実 API を叩く。
// enabled: false なので発火はボタンの refetch のみ。gcTime: 0 でキャッシュを残さない
const slowQuery = useQuery({
  queryKey: ['loading-sample', 'slow-fetch'],
  queryFn: async ({ signal }) => {
    await sleep(2000)
    return getProducts(undefined, undefined, signal)
  },
  enabled: false,
  gcTime: 0,
})

// 遅い更新通信: API を使わず 2 秒待つだけ(isMutating 経由の発火を確認する用)
const slowMutation = useMutation({
  mutationFn: () => sleep(2000),
})
</script>
```

- [ ] **Step 2: ルートとメニューを追加**

`src/router/index.ts` の routes、`/sample-dialog` の行の次に追加:

```ts
    { path: '/sample-loading', component: () => import('@/pages/LoadingSamplePage.vue') },
```

`src/stores/menuStore.ts` の `MENU_MASTER`、`sample-dialog` の行の次に追加(既存の列揃えに合わせる):

```ts
  { id: 'sample-loading', label: 'ローディング', icon: 'mdi-progress-clock', to: '/sample-loading' },
```

注意: menuStore は `persist: true` のため、既にアプリを開いたことがあるブラウザでは
localStorage に旧 visibleIds が残っており、新メニューはメニュー設定パネルの「非表示」側に現れる。
動作確認時は localStorage をクリアするか、設定パネルから追加する。

- [ ] **Step 3: 型チェックと全テスト**

Run: `npm run type-check`
Expected: エラーなし
Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 4: コミット**

```bash
git add src/pages/LoadingSamplePage.vue src/router/index.ts src/stores/menuStore.ts
git commit -m "feat: グローバルローディングの動作確認用サンプルページを追加"
```

---

### Task 5: 全体検証(手動確認)

**Files:** なし(検証のみ)

- [ ] **Step 1: 静的チェックと全テスト**

Run: `npm run lint`
Expected: エラーなし(自動修正が入った場合は差分を確認してコミットに含める)
Run: `npm run type-check`
Expected: エラーなし
Run: `npm run test:run`
Expected: 全テスト PASS

- [ ] **Step 2: モックサーバー込みで起動して手動確認**

Run: `npm run dev:mock`(Vite + Prism モックサーバーを併走起動)

ブラウザで確認する項目:

1. `/#/sample-loading` を開く(メニューに出ていなければ localStorage クリア or メニュー設定から追加)
2. 「遅い取得通信(2秒)」→ 押下直後に全画面グルグルが出て、約2秒後に消える
3. 「遅い更新通信(2秒)」→ 同上
4. グルグル表示中に背後のボタンがクリックできない(scrim で操作ブロック)
5. グルグルがスマホ枠(430px)の内側だけを覆う(PC プレビューの灰色背景は覆わない)
6. 在庫検索(`/#/stock-search`)で検索 → グルグルが出る + 既存のページ内 v-progress-linear も従来どおり動く
7. ページ遷移でエラーにならない(コンソール確認)

Expected: すべて OK。5 で枠の外まで覆ってしまう場合は v-overlay の `contained` が
効いていない(位置指定された祖先がない)ので、`.phone-wrapper`(position: relative)内に
収まっているか、v-app 直下に置かれているかを確認する。

- [ ] **Step 3: 完了確認**

lint で自動修正が入った場合:

```bash
git add -u
git commit -m "style: lint 自動修正"
```

すべての確認結果(テスト数・手動確認 7 項目の結果)を報告して完了。
