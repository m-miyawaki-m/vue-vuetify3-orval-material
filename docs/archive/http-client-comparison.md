# HTTP 通信手段の比較: Ajax vs fetch vs axios vs async/await

> **📦 アーカイブ資料**: この資料は orval / vue-query 導入検討期の学習資料です。現行の構成は [guides/orval-zod-data-fetching-flow.md](../guides/orval-zod-data-fetching-flow.md) と [guides/common-layer-architecture.md](../guides/common-layer-architecture.md) を参照してください。

このプロジェクトで採用している axios を軸に、
jQuery Ajax・ブラウザ標準の fetch・素の async/await との違いを整理する。

---

## 目次

1. [4つの立ち位置の整理](#4つの立ち位置の整理)
2. [Ajax（jQuery）とは何か](#ajaxjquery-とは何か)
3. [基本的な GET リクエストの比較](#基本的な-get-リクエストの比較)
4. [POST リクエストの比較](#post-リクエストの比較)
5. [エラーハンドリングの比較](#エラーハンドリングの比較)
6. [共通処理（ベース URL・ヘッダー・タイムアウト）](#共通処理ベース-urlヘッダータイムアウト)
7. [リクエストキャンセル（AbortController）](#リクエストキャンセルabortcontroller)
8. [TypeScript との相性](#typescript-との相性)
9. [このプロジェクトでの実装との対応](#このプロジェクトでの実装との対応)
10. [機能比較まとめ](#機能比較まとめ)
11. [選定指針](#選定指針)
2. [基本的な GET リクエストの比較](#基本的な-get-リクエストの比較)
3. [POST リクエストの比較](#post-リクエストの比較)
4. [エラーハンドリングの比較](#エラーハンドリングの比較)
5. [共通処理（ベース URL・ヘッダー・タイムアウト）](#共通処理ベース-urlヘッダータイムアウト)
6. [リクエストキャンセル（AbortController）](#リクエストキャンセルabortcontroller)
7. [TypeScript との相性](#typescript-との相性)
8. [このプロジェクトでの実装との対応](#このプロジェクトでの実装との対応)
9. [機能比較まとめ](#機能比較まとめ)
10. [選定指針](#選定指針)

---

## 4つの立ち位置の整理

```
async/await
  └── 非同期処理の「書き方（構文）」。Promise をわかりやすく書くためのもの。
      HTTP 通信とは無関係。fetch や axios と組み合わせて使う。

Ajax（Asynchronous JavaScript and XML）
  └── 「ページ全体をリロードせず非同期で通信する」技術の総称。
      特定のライブラリや API ではなく概念。
      実装手段は時代によって変わってきた:
        1999年〜  XMLHttpRequest (XHR)         ← 最初の実装
        2000年代  jQuery.ajax()                ← XHR の薄いラッパー
        2015年〜  fetch (標準化)               ← Promise ベースの新標準
        現在      axios / Vue Query / etc.     ← fetch/XHR の上に乗るライブラリ

fetch
  └── ブラウザ標準の HTTP 通信 API（Node.js 18+ でも標準）。
      「Ajax の現代的な実装手段」のひとつ。ライブラリ不要。

axios
  └── XHR（ブラウザ）または http モジュール（Node.js）をラップしたライブラリ。
      インターセプター・タイムアウト・自動 JSON パースなどが追加されている。
      fetch とは独立した実装（fetch のラッパーではない）。
```

**整理すると:**
- Ajax = 概念（非同期通信）
- XHR・fetch = ブラウザ標準 API
- jQuery.ajax・axios = ライブラリ（XHR / fetch を使いやすくしたもの）
- async/await = 構文（非同期コードの書き方）

---

## Ajax（jQuery）とは何か

### 歴史的背景

```
1999  XMLHttpRequest (XHR) が IE5 に実装される
2006  jQuery.ajax() が登場、XHR を大幅に簡略化
2015  fetch API が標準化、Promise ベースで登場
2016  axios が広まる（Node.js でも動く fetch 代替として）
2017  async/await が ES2017 で標準化
```

### jQuery.ajax() の書き方（参考）

```javascript
// jQuery Ajax（$.ajax）
$.ajax({
  url: '/api/products',
  method: 'GET',
  data: { page: 1, pageSize: 5 },
  success: function(data) {
    console.log(data.items)  // 成功時コールバック
  },
  error: function(xhr, status, err) {
    console.error(err)       // 失敗時コールバック
  }
})

// $.get ショートハンド
$.get('/api/products', { page: 1 }, function(data) {
  console.log(data)
})
```

### jQuery Ajax の問題点

```javascript
// コールバック地獄（複数の非同期処理を順番に実行する場合）
$.ajax({
  url: '/api/products',
  success: function(products) {
    $.ajax({
      url: '/api/categories',
      success: function(categories) {
        $.ajax({
          url: '/api/user',
          success: function(user) {
            // ← どんどんネストが深くなる（コールバック地獄）
            render(products, categories, user)
          }
        })
      }
    })
  }
})
```

Promise・async/await で書き直すと:

```typescript
// Promise チェーン
fetch('/api/products')
  .then(res => res.json())
  .then(products => fetch('/api/categories'))
  .then(res => res.json())
  .then(categories => /* ... */)

// async/await（最もシンプル）
async function init() {
  const products = await (await fetch('/api/products')).json()
  const categories = await (await fetch('/api/categories')).json()
  render(products, categories)
}
```

### XHR（XMLHttpRequest）の生 API（参考）

jQuery.ajax が内部で使っていた低レベル API。現在は直接使うことはほぼない。

```javascript
const xhr = new XMLHttpRequest()
xhr.open('GET', '/api/products?page=1')
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    const data = JSON.parse(xhr.responseText)
    console.log(data)
  }
}
xhr.onerror = function() {
  console.error('通信エラー')
}
xhr.send()
```

axios は内部でブラウザでは XHR を、Node.js では `http` モジュールを使っている。
（fetch をラップしているわけではない点に注意）

---

## 基本的な GET リクエストの比較

### 素の fetch（async/await なし）

```typescript
fetch('/api/products?page=1')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)  // ← 手動チェックが必要
    return res.json()
  })
  .then((data: ProductListResponse) => {
    console.log(data.items)
  })
  .catch(err => {
    console.error(err)
  })
```

### fetch + async/await

```typescript
async function fetchProducts() {
  const res = await fetch('/api/products?page=1')

  // fetch は 4xx/5xx でも例外を投げない。ok チェックが必須。
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const data: ProductListResponse = await res.json()  // ← 型アサーションが必要
  return data
}
```

### axios + async/await

```typescript
import axios from 'axios'

async function fetchProducts() {
  // axios は 4xx/5xx で自動的に例外を投げる
  // .data に自動で JSON がパースされて入る
  const res = await axios.get<ProductListResponse>('/api/products', {
    params: { page: 1 },
  })
  return res.data  // ProductListResponse 型
}
```

### このプロジェクトの実装（Orval + customAxiosInstance）

```typescript
// src/plugins/axios.ts
export const customAxiosInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return axiosInstance({ ...config, ...options }).then(res => res.data)
  //                                                          ^^^^^^^^
  //                                              res.data を直接返すので
  //                                              呼び出し側で .data は不要
}

// Orval 生成コード（src/api/products.ts）
const getProducts = (params?: GetProductsParams) =>
  customAxiosInstance<ProductListResponse>({ url: '/products', method: 'GET', params })

// コンポーネント（src/pages/ProductListPage.vue）
const { getProducts } = getProductsAPI()
const { data } = useAsync(() => getProducts(params.value), params)
// data.value が直接 ProductListResponse
```

---

## POST リクエストの比較

### fetch

```typescript
async function createProduct(body: CreateProductRequest) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',  // ← 必須。忘れるとサーバーが解析できない
    },
    body: JSON.stringify(body),            // ← 手動でシリアライズ
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Product
}
```

### axios

```typescript
async function createProduct(body: CreateProductRequest) {
  // Content-Type: application/json は自動設定
  // body は自動で JSON.stringify される
  const res = await axios.post<Product>('/api/products', body)
  return res.data
}
```

### 差のまとめ

| 作業 | fetch | axios |
|---|---|---|
| Content-Type ヘッダー | 手動で設定 | 自動（object を渡した場合） |
| JSON シリアライズ | `JSON.stringify(body)` が必要 | 自動 |
| JSON デシリアライズ | `await res.json()` が必要 | 自動（`res.data` に入る） |

---

## エラーハンドリングの比較

**最大の違い**: fetch は HTTP エラー（4xx/5xx）を例外として扱わない。

```typescript
// fetch: 4xx/5xx はエラーにならない
const res = await fetch('/api/products/9999')
console.log(res.ok)     // false（404 の場合）
console.log(res.status) // 404
// ↑ 例外は投げられない。ok チェックを忘れると正常終了扱いになる

// ネットワークエラー（サーバーに届かない）のみ例外になる
// ERR_CONNECTION_REFUSED → catch に入る
```

```typescript
// axios: 4xx/5xx は自動で例外になる
try {
  await axios.get('/api/products/9999')
} catch (err) {
  if (axios.isAxiosError(err)) {
    console.log(err.response?.status)   // 404
    console.log(err.response?.data)     // { message: '商品が見つからない' }
    console.log(err.message)            // 'Request failed with status code 404'
  }
}
```

### useAsync でのエラー捕捉

```typescript
// src/composables/useAsync.ts
async function execute() {
  try {
    data.value = await fn()
  } catch (e) {
    isError.value = true   // axios: 4xx/5xx もここに入る
    error.value = e        // fetch: ネットワークエラーのみここに入る
  }
}
```

**fetch を使うと `isError` が 4xx でも true にならない。**  
fetch に切り替える場合は `useAsync` 内で `res.ok` チェックを追加する必要がある。

```typescript
// fetch 対応版 useAsync（参考）
async function execute() {
  try {
    const res = await fetchFn()
    if (res instanceof Response && !res.ok) {
      throw new Error(`HTTP ${res.status}`)  // 手動でエラー化
    }
    data.value = res instanceof Response ? await res.json() : res
  } catch (e) {
    isError.value = true
    error.value = e
  }
}
```

---

## 共通処理（ベース URL・ヘッダー・タイムアウト）

### fetch: 毎回手書き or ラッパー関数が必要

```typescript
// ベース URL を共通化するには自前ラッパーを書く
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,  // 毎回ここに書くか、ここで追加
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

### axios: インスタンスに一元設定できる

```typescript
// src/plugins/axios.ts（現在の実装）
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,  // タイムアウトを追加するならここだけ
})

// インターセプターで認証ヘッダーを全リクエストに自動付与
axiosInstance.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${getToken()}`
  return config
})

// インターセプターでエラーレスポンスを共通処理
axiosInstance.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      router.push('/login')  // 401 は自動でログインへ
    }
    return Promise.reject(err)
  }
)
```

### タイムアウト

| | fetch | axios |
|---|---|---|
| 設定方法 | `AbortController` + `setTimeout` で自前実装 | `timeout: 10000` を指定するだけ |

```typescript
// fetch のタイムアウト（自前実装が必要）
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 10000)
try {
  const res = await fetch('/api/products', { signal: controller.signal })
} finally {
  clearTimeout(timer)
}

// axios のタイムアウト（設定だけ）
const res = await axios.get('/api/products', { timeout: 10000 })
```

---

## リクエストキャンセル（AbortController）

パラメータが変わったとき（ページ変更など）に進行中のリクエストをキャンセルしたいケース。

### fetch

```typescript
// fetch は最初から AbortController を受け取れる
const controller = new AbortController()
const res = await fetch('/api/products?page=2', {
  signal: controller.signal,
})
// キャンセル
controller.abort()
// → fetch が AbortError を投げる
```

### axios

```typescript
// axios も AbortController を受け取れる（v0.22.0+）
const controller = new AbortController()
const res = await axios.get('/api/products', {
  params: { page: 2 },
  signal: controller.signal,
})
// キャンセル
controller.abort()
// → axios が CanceledError を投げる
```

### useAsync でのキャンセル対応（拡張版）

現在の `useAsync` はキャンセル非対応。対応させる場合:

```typescript
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps?) {
  const data = ref<T | null>(null) as Ref<T | null>
  const isLoading = ref(false)
  const isError = ref(false)
  let controller: AbortController | null = null

  async function execute() {
    controller?.abort()                    // 前のリクエストをキャンセル
    controller = new AbortController()

    isLoading.value = true
    isError.value = false
    try {
      data.value = await fn(controller.signal)
    } catch (e) {
      // キャンセルによるエラーは isError にしない
      const isCanceled =
        (e as Error).name === 'AbortError' ||
        (e as Error).name === 'CanceledError'
      if (!isCanceled) isError.value = true
    } finally {
      isLoading.value = false
    }
  }

  // コンポーネント破棄時にキャンセル
  onUnmounted(() => controller?.abort())

  if (deps) {
    watch(deps, execute, { immediate: true })
  } else {
    execute()
  }

  return { data, isLoading, isError, execute }
}

// 使う側（signal を受け取る形に変える）
const { getProducts } = getProductsAPI()
const { data } = useAsync(
  (signal) => getProducts(params.value, { signal }),
  params,
)
```

---

## TypeScript との相性

### fetch

```typescript
// fetch はレスポンスの型を自動推論できない
const res = await fetch('/api/products')
const data = await res.json()
// data の型は any → 手動でアサーションが必要

const data = await res.json() as ProductListResponse  // アサーション
// ↑ 実際のレスポンスと型が一致しているかの保証はない（ランタイムで確認不可）
```

### axios

```typescript
// ジェネリクスで型を指定できる
const res = await axios.get<ProductListResponse>('/api/products')
const data = res.data  // ProductListResponse 型として扱われる
// ↑ ただし axios もランタイムで型を検証しているわけではない
//   Orval で OpenAPI から生成した型を使うのが最も信頼できる
```

### Orval + axios（このプロジェクト）

```typescript
// Orval が OpenAPI spec から型を生成するため最も安全
// getProducts の戻り値は Promise<ProductListResponse> として確定している
const { getProducts } = getProductsAPI()
const data = await getProducts({ page: 1 })
// data は ProductListResponse 型。型アサーション不要。
```

---

## このプロジェクトでの実装との対応

```
ユーザー操作
    │
    ▼
ProductListPage.vue
  useAsync(
    () => getProducts(params.value),  ← Orval 生成関数
    params
  )
    │
    ▼
src/composables/useAsync.ts
  fn() を実行 → try/catch で isLoading/isError/data を管理
    │
    ▼
src/api/products.ts（Orval 生成）
  customAxiosInstance<ProductListResponse>(
    { url: '/products', method: 'GET', params }
  )
    │
    ▼
src/plugins/axios.ts
  axiosInstance({ ...config })       ← axios インスタンスで実行
    .then(res => res.data)           ← レスポンスボディだけ返す
    │
    ▼
  HTTP リクエスト → API サーバー（Prism / 本番）
```

**この構成で fetch に差し替える場合の変更点:**

```typescript
// src/plugins/axios.ts を fetch 版に書き換えるだけでよい
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const customAxiosInstance = async <T>(
  config: { url: string; method: string; params?: Record<string, unknown>; data?: unknown },
  options?: RequestInit,
): Promise<T> => {
  // クエリパラメータを URL に結合
  const url = new URL(`${BASE_URL}${config.url}`, location.origin)
  if (config.params) {
    Object.entries(config.params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v))
    })
  }

  const res = await fetch(url.toString(), {
    method: config.method,
    body: config.data ? JSON.stringify(config.data) : undefined,
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)   // 手動エラー化
  return res.json() as T
}
// Orval 生成コードと useAsync はそのまま使える
```

---

## 機能比較まとめ

| 機能 | jQuery Ajax | fetch | axios | このプロジェクト（axios） |
|---|---|---|---|---|
| ブラウザ標準 | ❌（jQuery 依存） | ✅ | ❌ | ❌ |
| Node.js 対応 | ❌ | ✅（18+） | ✅ | ✅ |
| バンドルサイズ | 約30KB（jQuery込） | 0KB | 約14KB | 約14KB |
| Promise / async 対応 | △（`$.ajax().then()` は可） | ✅ | ✅ | ✅ |
| 4xx/5xx の自動エラー化 | ✅ | ❌（手動チェック必要） | ✅ | ✅ |
| JSON 自動シリアライズ | ✅ | ❌（手動） | ✅ | ✅ |
| JSON 自動デシリアライズ | ✅ | ❌（`await res.json()` 必要） | ✅ | ✅ |
| ベース URL 設定 | △（`$.ajaxSetup`） | ❌（自前ラッパー） | ✅（インスタンス） | ✅ |
| インターセプター | △（`$.ajaxPrefilter`） | ❌（自前ラッパー） | ✅ | ✅ |
| タイムアウト設定 | ✅（`timeout` オプション） | ❌（AbortController 自前） | ✅ | ✅ |
| リクエストキャンセル | △（`xhr.abort()`） | ✅（AbortController） | ✅（AbortController） | △（useAsync 拡張が必要） |
| TypeScript 型推論 | ❌（型定義なし） | △（`as` アサーション） | ✅（ジェネリクス） | ✅✅（Orval 生成型） |
| クエリパラメータ整形 | ✅（`data` オプション） | ❌（URLSearchParams 手動） | ✅（`params` オプション） | ✅（Orval が生成） |
| 認証ヘッダー共通付与 | △（`$.ajaxSetup`） | ❌（自前ラッパー） | ✅（インターセプター） | ✅ |
| アップロード進捗 | ✅ | △（ReadableStream） | ✅（`onUploadProgress`） | ✅ |
| 現在の推奨度 | ❌（レガシー） | ✅（シンプル用途） | ✅（実用） | ✅✅（型安全） |

---

## 選定指針

```
jQuery Ajax を使っているレガシーシステム
  └── 現代の開発では fetch または axios に移行することを推奨
      jQuery を外すだけでバンドルサイズが約30KB削減できる

依存ゼロにしたい・バンドルサイズ最小化・シンプルな GET のみ
  └── fetch + 薄いラッパー関数

認証・タイムアウト・エラー共通処理・インターセプターが必要
  └── axios

OpenAPI 仕様書がある・型安全に API 呼び出したい
  └── Orval + axios（このプロジェクトの選択）
      Orval は fetch クライアントも生成できるが axios の方が機能が揃っている
```

### 時代の流れまとめ

```
2000年代    jQuery.ajax()    コールバック地獄
    ↓
2015年〜    fetch()          Promise ベースで改善、ただし低レベル
    ↓
2016年〜    axios            fetch/XHR を使いやすくしたライブラリが普及
    ↓
2017年〜    async/await      非同期コードが同期っぽく書けるようになる
    ↓
2020年代    Orval + axios    OpenAPI から型・関数を自動生成、型安全が確立
```

**このプロジェクトの結論:**
Orval が axios の呼び出しを生成し、`customAxiosInstance` で一元管理しているため、
fetch に差し替えてもコンポーネント側・`useAsync` は無変更。
差し替えコストは `src/plugins/axios.ts` の1ファイルのみ。
ただし fetch 版にするとタイムアウト・インターセプターが使えなくなるため、
認証やエラートースト表示が必要になった段階で axios に戻すのが現実的。
