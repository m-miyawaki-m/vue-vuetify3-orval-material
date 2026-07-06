# Vol.3 データ・通信・Store 設計

## 1. 通信の共通化（Orval 連携）

### 1-1 4層アーキテクチャ

**現状フロー：**

```
Pinia Store → mockProducts（ハードコード）
```

**目標フロー：**

```
Pinia Store → Orval生成API関数 → axios共通インスタンス → バックエンド
```

| 層 | ファイル | 共通化する内容 |
|---|---|---|
| HTTPクライアント | `src/lib/axios.ts` | baseURL・認証・インターセプター |
| API関数（自動生成） | `src/api/` | Orval が OpenAPI から生成 |
| 状態管理 | `src/stores/` | loading・error・data |
| UI層 | `src/pages/`, `src/components/` | Store だけを見る |

### 1-2 axios 共通インスタンス（src/lib/axios.ts）

```ts
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) router.push('/login')
    return Promise.reject(err)
  }
)
```

全APIリクエストがここを通る → 認証・エラー処理を一箇所に集約。

### 1-3 Orval 設定（orval.config.ts）

```ts
export default defineConfig({
  product: {
    input: './openapi/product.yaml',
    output: {
      target: './src/api/product.ts',
      client: 'axios',
      override: {
        mutator: {
          path: './src/lib/axios.ts',
          name: 'apiClient',
        },
      },
    },
  },
})
```

> **注意:** 現在の `orval.config.ts` は定義が空（コメントアウト済み）。上記は目標とするセットアップ例。`npx orval` を実行すると `src/api/product.ts` に型付きAPI関数が自動生成される。

### 1-4 モックからの移行パス

| フェーズ | データソース | 切り替え方法 |
|---|---|---|
| 現在 | `mockProducts`（ハードコード） | — |
| API開発中 | MSW | Orval の `mock: true` オプション |
| 本番 | 実API | `VITE_API_BASE_URL` 環境変数 |

Store 内のデータ取得箇所を差し替えるだけで、UI層は変更不要。

---

## 2. Pinia Store 設計方針

### 2-1 Setup Store に統一

**Options Store（旧スタイル）— 使わない:**

```ts
defineStore('product', {
  state: () => ({
    products: [],
    keyword: '',
  }),
  getters: {
    filtered: (state) => ...
  },
  actions: {
    resetPage() { ... }
  },
})
```

**Setup Store（このプロジェクト統一）— `src/stores/product.ts` の実コード:**

```ts
export const useProductStore = defineStore('product', () => {
  const products = ref<Product[]>(mockProducts)
  const keyword = ref('')

  const filteredProducts = computed(() =>
    products.value.filter(p => {
      const matchKeyword = !keyword.value
        || p.name.includes(keyword.value)
        || p.description.includes(keyword.value)
      const matchCategory = !selectedCategory.value || p.category === selectedCategory.value
      const matchStock = !inStockOnly.value || p.inStock
      return matchKeyword && matchCategory && matchStock
    })
  )

  function resetPage() {
    currentPage.value = 1
  }

  return { products, keyword, filteredProducts, resetPage /* ...他フィールド省略 */ }
})
```

Composition API と同じ書き方 → TypeScript 推論が効きやすい。

### 2-2 Store の3種類と責務

| 種類 | 実例ファイル | 責務 |
|---|---|---|
| データStore | `stores/product.ts` | APIデータ・フィルター・ページング |
| UI設定Store | `stores/theme.ts` | テーマ選択・localStorage永続化 |
| 機能連携Store | `stores/scannerStore.ts` | スキャナーページへの遷移フロー |

**データStore（`src/stores/product.ts`）:**

```ts
const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredProducts.value.slice(start, start + PAGE_SIZE)
})
```

**UI設定Store（`src/stores/theme.ts`）:**

```ts
function setTheme(theme: AppTheme) {
  currentTheme.value = theme
  localStorage.setItem(STORAGE_KEY, theme)
}
```

**機能連携Store（`src/stores/scannerStore.ts`）:**

```ts
function requestScan(
  m: 'single' | 'continuous',
  cb: (results: ScanResult[]) => void,
  t?: string,
) {
  mode.value = m
  title.value = t
  _callback = cb
  router.push('/scanner')
}
```

### 2-3 State の置き場所（4段階）

| 置き場所 | 使うべき場面 | 実例 |
|---|---|---|
| コンポーネントローカル ref | そのコンポーネントだけ | `dialogOpen`（SearchPage） |
| props / emit | 親子間1〜2階層 | `ProductCard` への `product` 渡し |
| Pinia Store | 複数ページが参照 | `selectedProduct`・`currentTheme` |
| URL（router クエリ） | リロードで復元したい | 検索キーワード・ページ番号 |

**判断フロー:**

```
複数ページで使うか？
  → No:  ローカル ref か props/emit
  → Yes: リロードで復元したいか？
           → Yes: URL / localStorage
           → No:  Pinia Store
```

### 2-4 storeToRefs の使い方

**NG — リアクティビティが失われる:**

```ts
const store = useProductStore()
const { products, filteredProducts, pagedProducts, totalPages, keyword, currentPage } = store
// → 各値は ref ではなく生の値になってしまう
```

**OK — storeToRefs で分割代入:**

```ts
const store = useProductStore()
const { products, filteredProducts, pagedProducts,
        totalPages, keyword, currentPage } = storeToRefs(store)

// actions はリアクティブ不要なのでそのまま取り出す
const { resetPage, selectProduct } = store
```

`SearchPage.vue` では `store.keyword` のように直接参照しているが、分割代入する場合は必ず `storeToRefs` を使う。

### 2-5 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| Store関数 | `use〇〇Store` | `useProductStore` |
| Store ID | 小文字キャメル | `'product'`、`'theme'`、`'scanner'` |
| State | `ref` / `reactive` | `const products = ref([])` |
| Getter | `computed` | `const filteredProducts = computed(...)` |
| Action | 動詞から始まる | `setTheme`、`resetPage`、`requestScan` |

Store ID は DevTools や SSR のキーになる → 必ずユニークに。

---

## 3. チーム規約

- 通信は **4層** に分離：axios → Orval生成関数 → Store → UI
- Store は **Setup Store** に統一（Options Store は使わない）
- State の置き場所は **4段階** で判断する
- 分割代入には必ず `storeToRefs` を使う
- 命名は `use〇〇Store` / 動詞Action に統一
