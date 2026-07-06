# TypeScript リファレンス（プロジェクト実例付き）

## 基本型アノテーション

```ts
// プリミティブ
const name: string = '緑茶'
const price: number = 1000
const inStock: boolean = true
const nothing: null = null
const unknown: undefined = undefined

// 配列
const ids: number[] = [1, 2, 3]
const names: string[] = ['A', 'B']
const products: Product[] = []       // 型引数で要素の型を指定

// 関数
function greet(name: string): string {
  return `こんにちは ${name}`
}
const add = (a: number, b: number): number => a + b

// 戻り値なし
function log(msg: string): void {
  console.log(msg)
}

// 何でも受け取る（できるだけ避ける）
const anything: unknown = someValue   // unknown は使う前に型チェックが必要
const danger: any = someValue         // any はチェックをスキップ（非推奨）
```

---

## interface（オブジェクト型の定義）

```ts
// src/types/layout.ts
export interface FooterAction {
  icon: string
  label: string
  onClick: () => void   // 引数なし・戻り値なしの関数
  color?: string        // ? = 省略可能（undefined になりうる）
  disabled?: boolean
}

// src/types/scanner.ts
export interface ScanResult {
  text: string
  format: string
  timestamp: number
}

// ネスト
interface WorkSession {
  id: string
  state: ScannerSessionState   // 別のinterface を参照
}

// 使い方
const action: FooterAction = {
  icon: 'mdi-magnify',
  label: '検索',
  onClick: () => router.push('/search'),
}
```

---

## type（型エイリアス）

```ts
// ユニオン型（どれかひとつ）
type AppTheme = 'dark' | 'light' | 'practice'
type WorkSessionType = 'scanner'
type SnackColor = 'success' | 'error' | 'info'

// オブジェクト型（interface と似ているが extends できない）
type Query = { q?: string; category?: string; inStock?: boolean }

// 関数型
type Callback = (results: ScanResult[]) => void
type AsyncFn<T> = () => Promise<T>

// interface vs type
// - interface: オブジェクトの形の定義が主な用途、extends でマージできる
// - type: ユニオン・交差・ユーティリティ型など複雑な型を作るときに使う
// → オブジェクト形状なら interface、それ以外は type が慣習
```

---

## ジェネリクス（型引数）

型をパラメータとして受け取り、再利用可能にする。

```ts
// 関数のジェネリクス（src/composables/useAsync.ts）
export function useAsync<T>(
  fn: () => Promise<T>,        // T は呼び出し時に決まる
  deps?: WatchSource | WatchSource[],
) {
  const data = ref<T | null>(null)   // ref<T | null> → T 型か null
  ...
  return { data, isLoading, isError }
}

// 呼び出し側（T が自動推論される）
const { data } = useAsync(() => getProducts(params))
// data の型は Ref<ProductListResponse | null> と推論される

// 配列のジェネリクス
ref<MenuItem[]>([])           // MenuItem の配列で初期化された Ref
ref<Record<number, string>>({})  // キーが number、値が string のオブジェクト

// コンポーネントの defineProps でも使う
defineProps<{
  items?: string[]
}>()
```

---

## as const（値をリテラル型に固定）

```ts
// as const なし → type は string
const ICON_MAP = {
  success: 'mdi-check-circle',
  error: 'mdi-alert-circle',
}
// ICON_MAP.success の型: string

// as const あり → type はリテラル型に固定
const ICON_MAP = {
  success: 'mdi-check-circle',
  error: 'mdi-alert-circle',
} as const
// ICON_MAP.success の型: 'mdi-check-circle'（文字列リテラル型）

// 使い道：keyof / typeof との組み合わせ
type SnackColor = keyof typeof ICON_MAP    // 'success' | 'error'
type IconType = (typeof ICON_MAP)[SnackColor]  // 'mdi-check-circle' | 'mdi-alert-circle'

// const enum の代替（src/api/index.ts から）
export const ProductCategory = {
  食品: '食品',
  電子機器: '電子機器',
} as const
export type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory]
// → '食品' | '電子機器' というリテラルユニオン型になる
```

---

## keyof / typeof

```ts
// typeof: 値から型を取り出す
const obj = { a: 1, b: 'hello' }
type ObjType = typeof obj   // { a: number; b: string }

// keyof: オブジェクト型のキーをユニオン型にする
type Keys = keyof { success: string; error: string }  // 'success' | 'error'

// 組み合わせ（実際のプロジェクトコード）
const ICON_MAP = { success: 'mdi-check', error: 'mdi-alert' } as const
type SnackColor = keyof typeof ICON_MAP    // 'success' | 'error'
// → ICON_MAP のキーだけを型にする
```

---

## ユーティリティ型

```ts
// Record<K, V> : キーが K、値が V のオブジェクト型
const memos: Record<number, string> = {}     // { [productId]: メモテキスト }
const errors: Record<string, string> = {}   // { [fieldName]: エラーメッセージ }

// Partial<T> : T の全プロパティをオプショナルに
interface User { name: string; age: number }
const partial: Partial<User> = { name: 'だけでOK' }

// Required<T> : 全プロパティを必須に（Partial の逆）

// Omit<T, K> : T から K を除いた型
type ProductWithoutReviews = Omit<Product, 'reviews' | 'rating'>

// Pick<T, K> : T から K だけ抽出した型
type ProductSummary = Pick<Product, 'id' | 'name' | 'price'>

// NonNullable<T> : null と undefined を除く
type MaybeStr = string | null | undefined
type Str = NonNullable<MaybeStr>   // string

// ReturnType<T> : 関数の戻り値型を取り出す
function makeStore() { return { count: 0 } }
type StoreType = ReturnType<typeof makeStore>  // { count: number }
```

---

## 型ガード（型の絞り込み）

```ts
// typeof による絞り込み
function process(val: string | number) {
  if (typeof val === 'string') {
    val.toUpperCase()  // ここでは string
  } else {
    val.toFixed(2)     // ここでは number
  }
}

// instanceof による絞り込み（src/composables/useBarcodeScanner.ts）
catch (e) {
  if (e instanceof Error) {
    error.value = e.name === 'NotAllowedError'
      ? 'カメラへのアクセスが拒否されました。'
      : 'カメラの起動に失敗しました。'
  }
}

// カスタム型ガード（型述語）
function isMenuItem(v: unknown): v is MenuItem {
  return typeof v === 'object' && v !== null && 'id' in v
}

// in 演算子による絞り込み
function process(item: MenuItem | MenuChild) {
  if ('children' in item) {
    item.children  // MenuItem
  }
}

// filter での型ガード
const items = [null, { id: 1 }, undefined, { id: 2 }]
const valid = items.filter((v): v is { id: number } => v !== null && v !== undefined)
```

---

## オプショナルチェーン / Null 合体

```ts
// ?. : null/undefined なら undefined を返す（エラーを起こさない）
menuStore.items?.length           // items が null/undefined なら undefined
controls?.stop()                  // controls が null なら何もしない
controls?.switchTorch?.(on)       // メソッド自体も undefined かもしれない場合

// ?? : 左辺が null/undefined のとき右辺を返す
const saved = localStorage.getItem('key') ?? '{}'
const theme = saved ?? 'dark'

// || との違い
const val = 0 || 'default'    // 0 は falsy なので 'default' になってしまう
const val = 0 ?? 'default'    // 0 は null/undefined でないので 0 のまま

// !. : null でないと断言（使い過ぎ注意）
const el = document.getElementById('app')!  // null でないと主張
```

---

## 型アサーション（as）

```ts
// as: コンパイラに「この型だと信じて」と伝える（実行時チェックなし）
const data = fallbackData as MenuItem[]
const mockProducts = mockProductsData as Product[]

// unknown からの変換
const val = (someValue as unknown) as ScanResult

// DOM 要素
const input = document.querySelector('input') as HTMLInputElement
input.value = '緑茶'  // HTMLElement では value がないため as が必要

// as const（別の意味：値をリテラル型に固定）
const MODE = 'single' as const   // type: 'single'（string ではなく）
```

---

## import type

```ts
// 型だけをインポート（バンドルに含まれない）
import type { Product, MenuItem } from '@/api/index'
import type { Ref, WatchSource } from 'vue'
import type { ScanResult } from '@/types/scanner'

// 値もインポートする場合は type をつけない
import { ref, watch } from 'vue'          // ref は実装（関数）
import { defineStore } from 'pinia'
import { getAppAPI } from '@/api/index'   // 関数なので type なし

// 混在する場合
import { ref } from 'vue'
import type { Ref } from 'vue'
// または
import { ref, type Ref } from 'vue'      // インライン type
```

---

## 関数の型定義パターン

```ts
// 引数・戻り値を明示
function buildSearchQuery(
  keyword: string,
  category: string,
  inStock: boolean,
): Record<string, string> { ... }

// コールバック型
type Callback = (results: ScanResult[]) => void
let _callback: Callback | null = null

// 省略可能引数（? は undefined を許容）
function requestScan(
  mode: 'single' | 'continuous',
  cb: Callback,
  title?: string,           // 省略可（= string | undefined）
) { ... }

// デフォルト値
function fetchProducts(page = 1, pageSize = 5) { ... }

// オーバーロードなし → ユニオン型で対応
function process(val: string | number): string {
  return String(val)
}

// ジェネリック関数
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}
```

---

## よく出るパターン

### パターン 1: フォールバック付き型（API or モック）

```ts
// API の型を使いながらモックは as でキャスト
import type { Product } from '@/api/index'
import mockProductsData from '@/mocks/products-data.json'

const mockProducts = mockProductsData as Product[]
// JSON から読んだデータを Product[] として扱う
```

### パターン 2: Record で辞書を作る

```ts
// productId → メモの辞書
const memos = ref<Record<number, string>>({})
memos.value[productId] = 'テキスト'
const text = memos.value[productId] ?? ''
```

### パターン 3: as const でリテラルユニオンを作る

```ts
export const ProductCategory = {
  食品: '食品',
  電子機器: '電子機器',
} as const

// type ProductCategory = '食品' | '電子機器'
export type ProductCategory = typeof ProductCategory[keyof typeof ProductCategory]
```

### パターン 4: 型ガードで filter

```ts
// filter の結果に型を付ける
const resolved = issues.value
  .filter((i): i is Issue & { resolved: true } => i.resolved)
```

### パターン 5: 関数型を変数に持つ

```ts
// store 内でコールバックを保持
let _callback: ((results: ScanResult[]) => void) | null = null

function setCallback(cb: typeof _callback) {
  _callback = cb
}
_callback?.([result])   // null でないときだけ呼ぶ
```
