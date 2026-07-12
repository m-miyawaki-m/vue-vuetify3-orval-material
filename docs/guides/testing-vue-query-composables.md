# vue-query composable のテストの書き方 — QueryClient 差し替えパターンの深堀り

`docs/guides/team-guide.md` の
[5. テストの書き方](./team-guide.md#5-テストの書き方) で3層構造（純関数 / composable / コンポーネント /
ページ）と定番観点は説明済みです。このドキュメントはそのうち **composable 層で vue-query が絡む部分**だけを、
実在するテストコードを引用しながら深堀りします。

対象読者は、`useProductDetail.test.ts` などを一度コピーしたことはあるが中身までは追っていない人です。

---

## 1. 全体像: 何をモックし、何を本物で動かすのか

composable テストがモックしているのは **`customAxiosInstance` 一つだけ**です。vue-query 自体
（`useQuery` / `useMutation` / `QueryClient` / キャッシュ機構）は本物を動かします。

```typescript
// src/composables/queries/__tests__/useProductDetail.test.ts
vi.mock('@/plugins/axios', () => ({
  customAxiosInstance: vi.fn(),
}))
const mockedAxios = vi.mocked(customAxiosInstance)
```

`useStockSearch.test.ts` / `useRegisterProduct.test.ts` も同じ書き方です。orval 生成フック
（`src/api/index.ts`）は最終的に `customAxiosInstance`（`src/plugins/axios.ts`）を呼ぶので、ここだけ
モックすれば実ネットワークも Prism モックサーバーも不要になります。

モックしない（本物を使う）もの: **vue-query 本体**（`QueryClient`/キャッシュ・再フェッチ・キー管理）、
**`useSnackbar()`**（`useRegisterProduct.test.ts` は `state.show`/`state.color`/`state.text` をそのまま
読む）、**Vuetify・Pinia**（`src/test/setup.ts` が本物を登録。次章）。

想定と違いやすい点: axios ライブラリ自体ではなく、自前ラッパー **`customAxiosInstance` だけ**をモックして
いる。インターセプタでの `ApiError` 正規化は対象外（`src/api/apiError.test.ts` が別途保証）。

---

## 2. テスト用 QueryClient の仕組み — `src/test/setup.ts`

`vitest.config.mts` の `test.setupFiles` に登録され、全テストで自動実行されます。

```typescript
// src/test/setup.ts
beforeEach(() => {
  setActivePinia(createPinia())
  // テスト毎に新しい QueryClient（キャッシュ持ち越し防止・retry 無効で高速化）
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  config.global.plugins = [vuetify, [VueQueryPlugin, { queryClient }]]
})
```

- **`beforeEach` で `new QueryClient` を作り直す。** キャッシュはキー単位で保持されるため、使い回すと
  前のテストの `mockResolvedValue`/`mockRejectedValue` の結果が漏れる。
- **`retry: false`。** 本番の `createAppQueryClient()`（`src/plugins/vueQuery.ts`）は `retry: 1` だが、
  テストでは無効化。エラー系テストで毎回リトライが走ると `vi.waitFor` の完了待ちが伸びるため。
- **`config.global.plugins` に積む方式。** `@vue/test-utils` がこの後の `mount()` すべてに自動適用する
  ので、各テストファイル側で `VueQueryPlugin` を登録するコードは不要。

**注意**: 本番の `createAppQueryClient()` とは別物。`staleTime: 5分` や `QueryCache`/`MutationCache` の
`onError`（グローバル snackbar 連携）はテスト用 QueryClient には入っていない。したがって
`useStockSearch.test.ts` 等でエラーレスポンスを返しても、そのテスト中に snackbar は出ない。グローバル
`onError` の検証は5章の `vueQuery.test.ts` が別枠で担当する（3層分離の一例）。

---

## 3. query composable のテストパターン

### mount して composable を実行するヘルパー

`useQuery` は `setup()` 内でしか呼べない（`inject` で `QueryClient` を取得するため）。そこでダミー
コンポーネントに mount し、その `setup()` の中で実行して戻り値を取り出す。

```typescript
// useStockSearch.test.ts
function mountComposable<T>(composable: () => T): T {
  let result!: T
  mount(defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  }))
  return result
}
```

想定と違いやすい点: この `mountComposable` は共有ユーティリティに切り出されていない。
`useStockSearch.test.ts` / `useProductDetail.test.ts` / `useRegisterProduct.test.ts` /
`useGlobalLoading.test.ts` の**4ファイルがそれぞれ同じ関数をローカルにコピー**して持っている
（`src/test/setup.ts` にあるのは QueryClient/Vuetify/Pinia 登録のみ）。新規テストは既存ファイルの
コピーから始めれば自然にこの関数も付いてくる。

### 非同期の待ち方は `vi.waitFor`

`waitFor`（testing-library系）や `flushPromises` ではなく **Vitest 組み込みの `vi.waitFor`** で統一。

```typescript
const { searchResult, isLoading } = mountComposable(() => useStockSearch(ref(condition)))
await vi.waitFor(() => expect(isLoading.value).toBe(false))
expect(mockedAxios).toHaveBeenCalledWith(/* ... */)
expect(searchResult.value).toEqual(response)
```

`isLoading` が `false` に戻るのを待ってからリクエスト内容やレスポンス反映後の値を検証する形が全ファイル共通。

### `enabled` 待機状態（条件が null）のテストは待たない

```typescript
it('条件が null の間は通信しない', async () => {
  const { searchResult, isLoading } = mountComposable(() =>
    useStockSearch(ref<StockSearchCondition | null>(null)))
  expect(isLoading.value).toBe(false)
  expect(mockedAxios).not.toHaveBeenCalled()
  expect(searchResult.value).toBeNull()
})
```

「通信していないこと」は待っても変わらないので `vi.waitFor` は使わず、mount 直後の同期的な状態を
そのまま検証している。

### エラー時フォールバックのテスト

`useProductDetail` はオフライン想定でローカル JSON にフォールバックするため、「API成功 / エラー時
フォールバック / エラー+該当なしでnull」の3ケースになっている（team-guide.md の定番観点そのもの）。

```typescript
it('API エラー時はモック JSON の同 id 商品にフォールバック', async () => {
  mockedAxios.mockRejectedValue(new ApiError('接続できません', undefined))
  const { product, isLoading } = mountComposable(() => useProductDetail(1))
  await vi.waitFor(() => expect(isLoading.value).toBe(false))
  // src/mocks/products-data.json の id=1
  expect(product.value?.name).toBe('オーガニック緑茶')
})
```

`ApiError` を直接 `mockRejectedValue` に渡している。`customAxiosInstance` 自体がモックなのでインター
セプタは通らない。テスト側で最初から「正規化された後の状態」を作っている。

---

## 4. mutation のテストパターン — `useRegisterProduct.test.ts`

`submit / isSubmitting / error` の3点セットを3観点で検証する。`submit()` は `await` せず呼びっぱなしに
し、完了判定は `isSubmitting` の変化に委ねる。`useSnackbar()` はモックせず、`describe` 先頭で
`const { state } = useSnackbar()` を取得し、composable 内部の `showSnack('success', ...)` が実際に
書き換えた `state` をそのまま読む。

```typescript
// リクエスト内容
mockedAxios.mockResolvedValue(created)
const { submit, isSubmitting } = mountComposable(() => useRegisterProduct())
submit(payload)
await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
expect(mockedAxios).toHaveBeenCalledWith(
  expect.objectContaining({ url: '/products', method: 'POST', data: payload }),
  undefined,
)

// 成功時の副作用（onSuccess コールバック・成功 snackbar）
const onSuccess = vi.fn()
submit(payload, { onSuccess })
await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
expect(onSuccess).toHaveBeenCalledWith(created)
expect(state.show).toBe(true)
expect(state.color).toBe('success')
expect(state.text).toBe('登録しました')
```

**落とし穴**: `useSnackbar` の `state` は `reactive()` によるモジュールスコープの**シングルトン**（Pinia
store ではない）。`beforeEach` の `setActivePinia` ではリセットされないため、
`useRegisterProduct.test.ts` と `vueQuery.test.ts` はどちらも `beforeEach` で
`state.show = false; state.text = ''` を手動でリセットしている。これを忘れると前のテストの `text` が
残ったまま次の `expect` が意図せず通ってしまう。

**エラー時の snackbar はここではテストしない。** グローバル `MutationCache.onError` の責務であり、次章の
`vueQuery.test.ts` の担当。層の重複を避けるため `useRegisterProduct.test.ts` にエラー系ケースは無い。

---

## 5. グローバル横断処理のテスト — `QueryCache`/`MutationCache` の `onError` → Snackbar

`src/plugins/vueQuery.ts` の `createAppQueryClient()` は `QueryCache`/`MutationCache` に共通の
`onError` を仕込んでおり、これが全画面共通エラー snackbar の正体。テストする
`src/plugins/__tests__/vueQuery.test.ts` は他の composable テストとまったく違うアプローチを取る。

想定と違いやすい点: **mount も `vi.waitFor` も使わず、`onError` コールバックを手動で直接呼ぶ。** 実際に
クエリを失敗させて非同期にエラーへ到達させるのではない。

```typescript
it('onError が ApiError の message を snackbar に流す', () => {
  const client = createAppQueryClient()
  const onError = client.getQueryCache().config.onError
  onError?.(new ApiError('商品が見つかりません', 404), {} as Query<unknown, unknown>)
  expect(state.show).toBe(true)
  expect(state.color).toBe('error')
  expect(state.text).toBe('商品が見つかりません')
})
```

`getQueryCache().config.onError` でコールバック本体を取り出し、第二引数（本来 `Query`）はダミーの型
キャストで済ませる。`MutationCache` 側も `getMutationCache().config.onError?.(...)` で同様（第2〜4引数
もダミー値）。同ファイルは `getDefaultOptions().queries` で `retry: 1` / `refetchOnWindowFocus: false`
も直接検証している。

「実際にクエリを失敗させて発火を確認する」E2E寄りの検証ではなく、「onError 関数の中身が正しいか」を
単体で検証する設計。これにより composable 層のテストはエラー snackbar の存在を意識せず書ける（2章で
テスト用 QueryClient に `onError` が無いことと対になる）。

---

## 6. よくある落とし穴

| 落とし穴 | 対策 |
|---|---|
| retry によるタイムアウト伸長（本番は `retry: 1`） | composable テストは `retry: false` 固定なので通常無関係。`createAppQueryClient()` を直接使う `vueQuery.test.ts` は `retry: 1` のままなので注意 |
| QueryClient のキャッシュ持ち越し | `beforeEach` で毎回 `new QueryClient()` するため自動的に防止される。テスト内で独自に QueryClient を作る場合は自分で分離すること |
| `useSnackbar` の `state` は自動リセットされない（モジュールシングルトン） | snackbar 状態を検証するテストでは必ず `beforeEach` で `state.show = false` 等をリセットする |
| `ref` の unwrap 忘れ | `mountComposable` の戻り値は unwrap されない。比較時は `.value` を忘れない |
| `enabled` 待機ケースは `vi.waitFor` 不要 | 「変化しないこと」の確認は mount 直後の状態を直接 assert すればよい |
| composable テストではグローバル snackbar は検証できない | テスト用 QueryClient に `onError` が無い（2章）。エラー snackbar の有無は `vueQuery.test.ts` 側に書く |
| mount ヘルパーはファイルごとにコピー | 共有モジュール化されていないので、新規ファイルは既存テストのコピーから始める |

---

## 7. 新しい composable を書いたときのテスト雛形

既存パターンの合成。実際は `useProductDetail.test.ts`（取得系）または `useRegisterProduct.test.ts`
（更新系）をコピーするのが最短。共通の骨格は次の通り（`mountComposable` は各ファイルにコピーする）。

```typescript
vi.mock('@/plugins/axios', () => ({ customAxiosInstance: vi.fn() }))
const mockedAxios = vi.mocked(customAxiosInstance)

function mountComposable<T>(composable: () => T): T {
  let result!: T
  mount(defineComponent({ setup() { result = composable(); return () => h('div') } }))
  return result
}

// 取得系: useXxx(id) → { xxx, isLoading, error, refetch }
describe('useXxx', () => {
  beforeEach(() => { mockedAxios.mockReset() })

  it('API 成功時はレスポンスを返す', async () => {
    mockedAxios.mockResolvedValue(/* 期待するレスポンス */)
    const { xxx, isLoading } = mountComposable(() => useXxx(/* 引数 */))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(xxx.value).toEqual(/* 期待値 */)
  })

  it('API エラー時は error に ApiError が入る', async () => {
    mockedAxios.mockRejectedValue(new ApiError('失敗しました', 500))
    const { error, isLoading } = mountComposable(() => useXxx(/* 引数 */))
    await vi.waitFor(() => expect(isLoading.value).toBe(false))
    expect(error.value?.message).toBe('失敗しました')
  })
})

// 更新系: useXxxYyy() → { submit, isSubmitting, error }
describe('useXxxYyy', () => {
  const { state } = useSnackbar() // モジュールシングルトンなので手動リセットが必須

  beforeEach(() => {
    mockedAxios.mockReset()
    state.show = false
    state.text = ''
  })

  it('submit が正しいリクエストを送る', async () => {
    mockedAxios.mockResolvedValue(/* 作成結果 */)
    const { submit, isSubmitting } = mountComposable(() => useXxxYyy())
    submit(/* payload */)
    await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/xxx', method: 'POST', data: /* payload */ }),
      undefined,
    )
  })

  it('成功時: onSuccess が呼ばれ成功 snackbar が出る', async () => {
    mockedAxios.mockResolvedValue(/* 作成結果 */)
    const onSuccess = vi.fn()
    const { submit, isSubmitting } = mountComposable(() => useXxxYyy())
    submit(/* payload */, { onSuccess })
    await vi.waitFor(() => expect(isSubmitting.value).toBe(false))
    expect(onSuccess).toHaveBeenCalled()
    expect(state.show).toBe(true)
    expect(state.color).toBe('success')
  })
})
```

エラー時のグローバル snackbar・キャッシュ無効化のキー整合まで確かめるのは composable 単体テストの範囲外
（前者は `vueQuery.test.ts`、後者は一覧表示中に更新して再取得されるかを見る E2E の領域）。3層分離の原則
（team-guide.md 5章）通り、composable テストでは書かない。

---

## 関連資料

- [チーム製造ガイド 5. テストの書き方](./team-guide.md#5-テストの書き方) — 3層構造・観点の洗い出し方の全体像
- [共通層の考え方とアーキテクチャ](./common-layer-architecture.md) — vue-query 入門・エラー処理3段構え
- [vue-query-architecture.md](../reference/vue-query-architecture.md) — QueryClient・QueryKey・状態機械の詳細
