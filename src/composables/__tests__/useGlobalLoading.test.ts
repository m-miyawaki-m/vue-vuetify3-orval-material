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
