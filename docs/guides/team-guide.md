# チーム製造ガイド — ページの作り方

ページを製造する人が読む唯一の入口です。「なぜこの形になっているか」の背景・設計判断は
[共通層の考え方とアーキテクチャ](./common-layer-architecture.md) にまとめてあります。迷ったらまずここを読み、
仕組みの理由が気になったらリンク先を見てください。

このガイドは vue-query（サーバーからのデータ取得・更新を管理するライブラリ）や Pinia（クライアント側の状態管理）を
ほとんど知らない前提で書いています。専門用語が出てきたら都度説明します。

## 大原則（2行）

> **処理は `@/composables/**`・`@/stores/**` の `useXxx()`、型は `@/types/**` から。**
> **`@/api`・`@tanstack/vue-query`・`axios` を直接 import したら ESLint エラー。**

エラー処理はページに書かなくても共通処理が snackbar（画面下に一瞬出る通知バー）を出します。
ページ側で `try/catch` を書く必要はありません。

なぜこの2行だけで済むのか、なぜ ESLint で強制するのかは
[common-layer-architecture.md の設計判断の記録](./common-layer-architecture.md#設計判断の記録) を参照してください。

---

## 1. ページでデータを表示したい（取得系）

### 基本パターン

```vue
<script setup lang="ts">
import { useProductDetail } from '@/composables/queries/useProductDetail'

const props = defineProps<{ id: string }>()
const productId = computed(() => Number(props.id))

const { product, isLoading, error, refetch } = useProductDetail(productId)
// product : データ本体（null 許容）。取得完了で勝手に入る
// isLoading: 初回ロード中かどうかの真偽値
// error    : こだわった個別エラー表示をしたい時だけ見る（見なくても snackbar は出る）
// refetch  : 明示的に再取得したい時だけ呼ぶ関数
</script>
```

取得系 composable は **必ず `データ・isLoading・error・refetch` の4点セット** を返します。
データの名前だけドメインに合わせて変わります（`product` / `productList` / `menuItems` など）。

### ローディング・エラー・空状態の template 実例

```vue
<template>
  <!-- ローディング中 -->
  <v-progress-linear v-if="isLoading" indeterminate color="primary" />

  <!-- 取得成功（データあり） -->
  <div v-else-if="product">{{ product.name }}</div>

  <!-- 取得失敗 or 該当データなし -->
  <v-alert v-else type="error" variant="tonal">見つかりませんでした。</v-alert>
</template>
```

一覧系はさらに「0件」の状態が増えます（`ProductListPage.vue` の実例）:

```vue
<template v-if="!isLoading">
  <template v-if="productList.items.length > 0">
    <ProductCard v-for="p in productList.items" :key="p.id" :product="p" />
  </template>
  <v-alert v-else type="info" variant="tonal">
    条件に一致する商品が見つかりませんでした。
  </v-alert>
</template>
```

### `isFallback` など追加フィールドの扱い

`useMenu` / `useProductList` / `useProductDetail` はオフライン時（API 疎通不可時）に
ローカル JSON へフォールバック表示する仕組みを持っています。`useMenu` と `useProductList` は
それを画面に伝える `isFallback` フィールドを追加で返します。

```vue
<script setup lang="ts">
const { menuItems, isFallback, isLoading } = useMenu()
</script>

<template>
  <v-chip v-if="isFallback" color="warning" variant="tonal" prepend-icon="mdi-wifi-off">
    オフラインモード（ローカルデータ）
  </v-chip>
</template>
```

`isFallback` は「4点セットに追加されたオプションフィールド」という位置づけです。新しく composable を
作るとき、フォールバック表示が必要ないなら実装不要です（`useProductDetail` は `isFallback` を持たず、
`product` 自体をフォールバック値に差し替える実装になっています）。composable ごとに実装が違ってよい部分なので、
使う前に該当ファイルの返り値を確認してください。

### `refetch` の使いどころ

`refetch` は「ボタンを押したら明示的に再取得したい」場合だけ使います。例: 「再読み込み」ボタン、
プルリフレッシュ。何もしなくても以下のケースは**自動で**再取得されるので `refetch` は不要です。

- 検索条件・ページ番号など、渡している引数（params）が変わったとき（次項参照）
- POST/PUT 等の更新が成功してキャッシュが無効化されたとき（「2. 更新系」参照）

### params がリアクティブに再フェッチされる仕組み

取得系 composable の引数は `MaybeRef<T>`（`T` そのもの、または `Ref<T>` のどちらでも受け取れる型）です。
**`computed` を渡すと、その中身が変わるたびに自動で再フェッチされます。**

```typescript
// ProductListPage.vue の実例
const currentPage = ref(1)
const params = computed<GetProductsParams>(() => ({
  q: queryQ.value,
  category: queryCategory.value,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

const { productList, isLoading } = useProductList(params)
// currentPage.value が変わる → params (computed) の中身が変わる
// → 内部の vue-query が「キーが変わった」と検知して自動的に再フェッチする
```

ここで言う「キー」（queryKey）についての詳しい説明は
[vue-query 入門](./common-layer-architecture.md#vue-query-の考え方の入門解説) を参照してください。
一言で言うと「同じキーならキャッシュから即表示・違うキーなら新しく取得」という仕組みです。

**お手本ページ**: `src/pages/ProductListPage.vue`（一覧＋検索＋ページネーション）、
`src/pages/DetailPage.vue`（詳細＋登録）、`src/pages/MainMenuPage.vue`（フォールバック表示）

---

## 2. ページから登録・更新したい（更新系）

### 基本パターン

```vue
<script setup lang="ts">
import { useRegisterProduct } from '@/composables/mutations/useRegisterProduct'

const { submit, isSubmitting, error } = useRegisterProduct()

function onSave() {
  // 成功 snackbar・失敗 snackbar・一覧キャッシュの更新は共通層がやる。
  // ページは「成功したら画面をどうするか」だけ書く
  submit(form.value, { onSuccess: () => router.back() })
}
</script>

<template>
  <v-btn :loading="isSubmitting" @click="onSave">登録</v-btn>
</template>
```

更新系 composable は **必ず `submit・isSubmitting・error` の3点セット** を返します。

### `onSuccess` で画面遷移・後処理を書く理由

更新系はページごとに「成功したあと何をするか」が異なります（一覧に戻る／ダイアログを閉じる／
別のクライアント状態を更新する、など）。この部分だけは composable 側で決め打ちにできないため、
`submit(payload, { onSuccess })` という形でページに委譲しています。

`DetailPage.vue` の実例（成功したら memo store を更新する）:

```typescript
function onConfirm() {
  // ... バリデーション ...
  submit(
    { name: p.name, category: p.category, price: p.price, inStock: p.inStock, description: p.description },
    { onSuccess: () => memoStore.setMemo(p.id, localMemo.value) },
  )
}
```

一方で「成功 snackbar を出す」「関連キャッシュを無効化する」は**どのページでも共通**の処理なので
composable 内部（`useRegisterProduct` 自身）に固定で書かれています。ページからは触れません。

### snackbar とキャッシュ無効化が自動である説明

`src/composables/mutations/useRegisterProduct.ts` の中身:

```typescript
const mutation = usePostProduct({
  mutation: {
    onSuccess: async () => {
      // ['products'] 前方一致で一覧・詳細キャッシュをまとめて無効化
      await queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() })
      showSnack('success', '登録しました')
    },
  },
})
```

- `invalidateQueries` は「このキーのキャッシュはもう古い」とマークする処理です。画面に一覧ページが
  表示されていれば、バックグラウンドで自動的に再取得され、次に一覧に戻ったときには新しいデータが出ます。
  ページ側で「一覧を再読み込みする」コードを書く必要はありません。
- 成功 snackbar は composable 内で `showSnack('success', '登録しました')` を呼んで出しています。
  文言を変えたい場合は composable 側を編集します（ページからは変更できません）。
- **失敗時**は何もしなくても表示されます。これは `src/plugins/vueQuery.ts` の `MutationCache.onError`
  がグローバルに snackbar を出しているためです（詳しくは「7. エラー処理の考え方（読むだけでOK）」）。

### `error` を個別表示したい場合の書き方

グローバル snackbar だけで十分なら `error` は無視してよいです。フォームの特定フィールドの下に
エラーメッセージを出したいなど、画面固有の見せ方をしたい場合だけ使います。

```vue
<script setup lang="ts">
const { submit, isSubmitting, error } = useRegisterProduct()
</script>

<template>
  <v-alert v-if="error" type="error" variant="tonal" density="compact">
    {{ error.message }}
  </v-alert>
</template>
```

`error` の型は `ApiError | null`（`error.message` は文字列、`error.status` は HTTP ステータスコード）です。
axios 層で正規化済みなので、axios や response の内部構造を知る必要はありません。

**お手本**: `src/composables/mutations/useRegisterProduct.ts` と `src/pages/DetailPage.vue` の `onConfirm`

---

## 3. 新しい API を使いたい（composable の追加手順）

新しいエンドポイントを使うページを作るときの手順です。画面例つきで4ステップです。

### Step 1: `openapi/api.yaml` にエンドポイントを追加

既存の定義をまねて書きます。GET の例（`/products` の一覧取得部分）:

```yaml
/products:
  get:
    operationId: getProducts
    summary: 商品一覧取得
    tags: [products]
    parameters:
      - name: q
        in: query
        schema:
          type: string
    responses:
      '200':
        description: 商品一覧
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductListResponse'
```

POST の例（`/products` の登録部分）:

```yaml
post:
  operationId: postProduct
  summary: 商品登録
  tags: [products]
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ProductInput'
  responses:
    '201':
      description: 登録した商品
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Product'
    '400':
      description: 入力エラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

必要なら `components.schemas` にリクエスト/レスポンスの型も追加します（`ProductInput` などを参考に）。

**サンプルデータ（モック応答）を持たせる場合**: `openapi/examples/` に応答 JSON を1ファイル置き、
レスポンス定義に `example:` で参照させます。Prism モックサーバー（`npm run dev:mock`）は
この JSON をそのままレスポンスとして返します（`example` がない場合はスキーマから適当な値が
自動生成されるだけになります）:

```yaml
responses:
  '200':
    description: 商品一覧
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ProductListResponse'
        example:
          $ref: './examples/products-list.json'   # openapi/examples/ 配下に置いた JSON
```

JSON の中身は必ずスキーマと一致させてください（プロパティの欠け・型違いがあると、モックでは
動くのに zod 検証や型で食い違う、という気づきにくい不整合になります）。実例:
`openapi/examples/products-list.json` / `product-detail.json` / `menu.json`。

### Step 2: `npm run orval` を実行

```bash
npm run orval
```

これで以下が自動生成されます。**手編集は禁止**（次回実行時に上書きされて消えます）。

- `src/api/index.ts` … `useGetXxx` / `usePostXxx` などの vue-query フック
- `src/types/api/*.ts` … `Xxx` / `XxxInput` などの TypeScript 型（`orval.config.ts` の
  `output.schemas: './src/types/api'` 設定によりここに分離生成される）
- `src/api/index.zod.ts` … レスポンス検証用の zod スキーマ

### Step 3: composable 雛形をコピーして1ファイル作る

GET なら `src/composables/queries/`、POST/PUT/DELETE なら `src/composables/mutations/` に
1エンドポイント = 1ファイルで作ります。雛形は次項。

### Step 4: テスト雛形をコピーする

`src/composables/queries/__tests__/useProductDetail.test.ts` をコピーしてケースを書き換えます
（詳細は「5. テストの書き方」）。

### 取得系の雛形

```typescript
// src/composables/queries/useXxx.ts
import { computed, type MaybeRef } from 'vue'
import { useGetXxx } from '@/api' // TODO: orval が生成したフック名に変更
import type { Xxx } from '@/types/api' // TODO: 型名を変更

/** TODO: 何を取得するか1行で書く */
export function useXxx(id: MaybeRef<number>) {
  const query = useGetXxx(id)
  const xxx = computed(() => query.data.value ?? null) // TODO: データ名を変更
  return {
    xxx,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

### 更新系の雛形

```typescript
// src/composables/mutations/useXxxYyy.ts（例: useRegisterProduct = 動詞＋対象）
import { useQueryClient } from '@tanstack/vue-query'
import { usePostXxx, getGetXxxQueryKey } from '@/api' // TODO: フック名を変更
import type { Xxx, XxxInput } from '@/types/api' // TODO: 型名を変更
import { useSnackbar } from '@/composables/useSnackbar'

/** TODO: 何を登録/更新するか1行で書く */
export function useXxxYyy() {
  const queryClient = useQueryClient()
  const { showSnack } = useSnackbar()

  const mutation = usePostXxx({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetXxxQueryKey() })
        showSnack('success', '登録しました') // TODO: 文言を変更
      },
    },
  })

  function submit(
    payload: XxxInput,
    callbacks?: { onSuccess?: (result: Xxx) => void },
  ) {
    mutation.mutate({ data: payload }, {
      onSuccess: (result) => callbacks?.onSuccess?.(result),
    })
  }

  return { submit, isSubmitting: mutation.isPending, error: mutation.error }
}
```

### 応用: 画面固有の検索オブジェクトを POST で送る（複雑な検索条件）

検索条件が多い画面（複数キーワード OR・複数カテゴリ OR など）は、GET のクエリパラメータでは
表現しきれません。その場合は **画面専用の検索条件オブジェクトを openapi.yaml に定義し、
POST で送る**パターンを使います。お手本一式:

| 役割 | ファイル |
|---|---|
| API 契約（画面固有の条件スキーマ） | `openapi/api.yaml` の `POST /products/stock-search` と `StockSearchCondition` |
| composable | `src/composables/queries/useStockSearch.ts` |
| テスト | `src/composables/queries/__tests__/useStockSearch.test.ts` |
| 画面 | `src/pages/StockSearchPage.vue`（`/stock-search`） |

ポイントは3つ:

1. **条件オブジェクトのプロパティ構成は画面ごとに自由**。ただし必ず openapi.yaml にスキーマとして
   定義する（`Record<string, unknown>` のような何でも入る型は禁止 — 型補完・zod 検証・Prism モックが
   全部効かなくなる）。
2. **HTTP は POST でも「検索＝取得」なので useQuery で包む**。orval は POST を useMutation として
   生成するが、それは使わず、生成された素の関数（`searchStockProducts`）を `useQuery` の `queryFn` に
   渡す。この吸収は composable 内で行うので、ページから見た形は他の取得系と同じ:

   ```typescript
   const condition = ref<StockSearchCondition | null>(null)  // null の間は検索しない
   const { searchResult, isLoading, error } = useStockSearch(condition)

   function onSearch() {
     condition.value = { keywords: [...], categories: [...], inStockOnly: true }  // ← ここで初めて通信
   }
   ```

3. **queryKey は `['products', 'stock-search', condition]` のように手書きになる**（orval が
   query 用のキーを生成しないため。これはこのパターンだけの例外）。先頭を `'products'` に
   しておくことで、商品登録時の invalidate（`['products']` 前方一致）で検索結果も自動で
   再取得される。

---

## 4. 状態を持ちたい（store か ref か）

### 判断表

| データの種類 | 置き場所 |
|---|---|
| サーバーから取ってくるデータ（API レスポンス） | `composables/queries`（store に入れない） |
| 画面をまたいで持ちたいクライアント状態（設定・入力途中・端末状態） | Pinia store |
| 1画面で完結する状態 | ページ内 `ref` |

### 判断フロー

1. **そのデータは API から取得するものか？** → Yes なら composable（`composables/queries`）一択。
   store には入れません（理由は
   [サーバー状態とクライアント状態を分ける考え方](./common-layer-architecture.md#サーバー状態とクライアント状態を分ける考え方)）。
2. **No（ユーザーが入力した値・UI の開閉状態など）の場合、他のページからも参照/更新する必要があるか？**
   → Yes なら Pinia store。No ならページ内 `ref` で十分です。
3. **store に入れる場合、アプリを閉じて再度開いても値を覚えていてほしいか？**
   → Yes なら `persist: true` を付ける（次項）。No ならメモリ上だけで良いので付けない
   （例: `scannerStore` のようなセッション中だけの状態）。

### store の雛形

```typescript
// src/stores/xxxStore.ts（ファイル名は xxxStore.ts、id は 'xxx'）
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useXxxStore = defineStore('xxx', () => {
  const value = ref('')

  function setValue(v: string) {
    value.value = v
  }

  return { value, setValue }
}, {
  persist: true, // アプリ再起動後も保持したい場合のみ。手書き localStorage は禁止
})
```

実例: `src/stores/settingsStore.ts`（`errorHistoryLimit` を `persist: true` で保持）。

### persist の注意（手書き localStorage 禁止の理由）

- `persist: true` を付けるだけで pinia-plugin-persistedstate が localStorage への保存・復元を
  自動でやってくれます。`localStorage.setItem` / `getItem` を自分で書く必要はありません。
- 手書き localStorage を許可すると、保存タイミング・キー名・JSON のシリアライズ方法が store ごとに
  バラバラになり、後から見た人が「このデータはいつ保存されるのか」を追えなくなります。
  `persist: true` に統一することで、store を見れば「永続化されるかどうか」が一目で分かります。

ページから見ると store も composable も「`useXxx()` を呼ぶと ref と関数が返る」で同じ形です。

---

## 5. テストの書き方

### 考え方: 層ごとに「何を検証し、どこをモックするか」を分ける

このプロジェクトのテストは3層に分かれます。**下の層で保証済みのことを上の層で再検証しない**のが
分離の大原則です。上の層に行くほど「モックする境界」が1段ずつ上がります。

| 層 | 検証すること | モックする境界 | 雛形 |
|---|---|---|---|
| 純関数（`utils/`） | 入力 → 出力の変換ロジック | なし（モック不要） | `searchUtils.test.ts` |
| composable（関数テスト） | 「API がこう応答したら、こういう ref を返す」 | `customAxiosInstance`（通信の一番外側） | 取得系: `useProductDetail.test.ts` / `useStockSearch.test.ts`、更新系: `useRegisterProduct.test.ts` |
| 再利用コンポーネント（`components/`） | 「props → 表示」「操作 → emit」の契約 | なし（props を直接渡す） | `BaseDialog.test.ts` / `ProductCard.test.ts` |
| ページ | 「入力→条件組み立て」「状態→表示分岐」「操作→遷移」 | **composable を丸ごと**（`vi.mock`） | `StockSearchPage.test.ts` |

それぞれの層で**書かないこと**も決まっています:

- **composable テストで書かないこと**: 画面の表示（それはページの責務）、ApiError への正規化
  （`apiError.test.ts` で保証済み）、キャッシュの挙動（vue-query の責務）
- **ページテストで書かないこと**: 通信の URL・メソッド・ボディ（composable テストで保証済み）、
  snackbar が出るか（`vueQuery.test.ts` で保証済み）、Vuetify コンポーネント自体の動作
  （v-select が開くか等 — ライブラリの責務）

この分離を守ると「壊れたら本当にその層のバグ」というテストだけになり、内部実装のリファクタで
無関係なテストが落ちなくなります。逆に、ページ内の条件組み立てが複雑になってきたら
（例: `buildSearchQuery`）、純関数として `utils/` に切り出して1層目でテストするのが定石です。

なお、この3層（すべて Vitest）の上に、実ブラウザで画面をまたぐフロー（検索 → 詳細 → 登録など）を
検証する E2E テスト（Playwright、`npm run test:e2e`）があります。書き方と Vitest との使い分けは
[playwright-reference.md](../reference/playwright-reference.md) を参照してください。

### テストケースの洗い出し方（観点抽出）

「どの層に書くか」が決まったら、「何ケース書くか」は次の手順で洗い出します。

1. **定型の観点から始める** — 各層に定番の観点セットがあります（この後の各小節を参照）。
   取得系 composable なら「成功 / エラー時フォールバック / 該当なし」、更新系なら
   「リクエスト内容 / 成功時の副作用 / 完了で isSubmitting が戻る」、コンポーネントなら
   「props → 表示 / slots → 表示 / 操作 → emit」、ページなら「入力 → 引数 / 状態 → 表示分岐 /
   操作 → 遷移」。まずこの定型を埋め、対象固有の観点を足していきます。
2. **条件の組み合わせはデシジョンテーブルで MECE に列挙する** — 入力条件が2つ以上絡む
   ロジック（検索条件の組み立てなど）は、頭の中で数えず表にします。条件を列、ケースを行にして
   全組み合わせを列挙し、テーブルをテストファイルのコメントに埋め込み、各 `it()` の名前に
   `[BQ-1]` のようなケース ID を付けてトレーサビリティを確保します（実例:
   `src/utils/__tests__/searchUtils.test.ts`）。
3. **境界値を必ず追加する** — 組み合わせ表とは別に、次のチェックリストを機械的に当てます:
   **空文字 / 空白のみ / null・未指定 / 0件 / 上限（最大件数・最終ページ）**。
   デシジョンテーブルの末尾に境界値ケースとして足すのが定石です（searchUtils の BQ-9 が例）。
4. **画面をまたぐ確認だけシナリオに変換する** — デシジョンテーブルのケースのうち、実ブラウザで
   確認すべきものだけを「操作手順 → 期待結果」のシナリオテーブルに変換して E2E にします。
   単体テストで検証済みのロジックを E2E で再検証しないこと（層の大原則と同じ）。

### 純関数テスト（`searchUtils.test.ts` の解説）

雛形: `src/utils/__tests__/searchUtils.test.ts`

mount もモックも不要で、関数を import して入力 → 出力を `expect` するだけです。3層の中で一番
書きやすく実行も速いので、テストしたいロジックはできるだけこの層に寄せるのが基本方針です。

雛形では、条件の組み合わせ（キーワード有無 × カテゴリ有無 × 在庫のみ）を**デシジョンテーブル**として
コメントに書き、ケース ID（`BQ-1` など）をテスト名と対応させています。条件分岐が多い関数は
この形にすると、抜けている組み合わせが一目で分かります。

### composable テスト（`useProductDetail.test.ts` の解説）

雛形: `src/composables/queries/__tests__/useProductDetail.test.ts`

```typescript
vi.mock('@/plugins/axios', () => ({
  customAxiosInstance: vi.fn(),
}))
const mockedAxios = vi.mocked(customAxiosInstance)
```

**なぜ `customAxiosInstance` を mock するのか**: orval が生成したフック（`useGetProductById` など）は
最終的に `customAxiosInstance`（`src/plugins/axios.ts`）を呼んで HTTP 通信します。ここを mock すれば、
実際のネットワーク通信や Prism モックサーバーを起動せずに「API がこう応答したら composable はこう振る舞う」を
テストできます。`mockedAxios.mockResolvedValue(...)` で成功レスポンス、`mockedAxios.mockRejectedValue(new ApiError(...))`
で失敗を再現します。

vue-query は Vue コンポーネントの `setup()` 内でしか使えないため、composable 単体を直接呼ぶことができません。
そのためテスト用のダミーコンポーネントに `mount` して、その中で composable を実行するヘルパーを使います
（`mountComposable` 関数、`src/test/setup.ts` が `VueQueryPlugin` をテストごとに自動登録済み）。

テストケースの型（`useProductDetail` の例）:

1. API 成功時: レスポンスの商品を返す
2. API エラー時: モック JSON の同 id 商品にフォールバック
3. API エラーかつモックにも無い id: `null`

新しい取得系 composable を作ったら、このファイルをコピーして `import` と期待値を書き換えるだけで
同じ形のテストが書けます。

### 更新系 composable テスト（`useRegisterProduct.test.ts` の解説）

雛形: `src/composables/mutations/__tests__/useRegisterProduct.test.ts`

モックの境界は取得系と同じ `customAxiosInstance` で、`mountComposable` の使い方も同じです。
違いは検証の観点だけです:

1. **submit が正しいリクエストを送るか**: `submit(payload)` のあと `toHaveBeenCalledWith` で
   URL・メソッド・ボディを検証（取得系の「引数 → リクエスト」に相当）
2. **成功時の副作用**: `onSuccess` コールバックが作成結果付きで呼ばれるか、成功 snackbar が出るか
   （`useSnackbar()` の `state` を直接読んで検証。成功通知は composable 自身の責務なのでここで書く）
3. **完了待ちのイディオム**: mutation は非同期なので
   `await vi.waitFor(() => expect(isSubmitting.value).toBe(false))` で完了を待ってから検証する

エラー時の snackbar はグローバル（`MutationCache` の `onError`、`vueQuery.test.ts` で保証済み）なので、
ここでは書きません。新しい更新系 composable を作ったら、このファイルをコピーして
`import`・payload・期待値を書き換えるだけです。

### 再利用コンポーネントテスト（`BaseDialog.test.ts` / `ProductCard.test.ts` の解説）

雛形: `src/components/dialog/__tests__/BaseDialog.test.ts`、`src/components/product/__tests__/ProductCard.test.ts`

`components/` 配下の再利用部品（dialog / card / ui など）は、ページと違って composable を使わない
「props を受けて表示し、操作を emit で返す」だけの部品なので、モックは不要です。検証するのは
**公開インターフェース（契約）**だけです:

1. **props → 表示**: props を渡して mount し、DOM に反映されるかを検証
   （例: `modelValue: true` でタイトルが表示される）
2. **slots → 表示**: スロットに渡した内容が描画されるか
3. **操作 → emit**: 要素を `trigger('click')` して `emitted()` を検証
   （例: `ProductCard.test.ts` — カードクリックで `click` イベントが商品オブジェクト付きで emit される）

テストファイル冒頭のヘッダーコメントに props / v-model / slots / emit を列挙し、それを
テストケースと対応させます。ヘッダーに書ききれない振る舞いが増えてきたら、部品が大きすぎるサインです。

Vuetify の v-dialog / v-overlay / v-snackbar は中身を body へ teleport するため `wrapper.find` では
見つかりません。`mount(..., { attachTo: document.body })` して `document.body` /
`document.querySelector` で検証するのがこのプロジェクトのイディオムです（テスト末尾で `w.unmount()` を忘れずに）。

なお、レイアウト（`MainLayout` / `SubLayout`）とサンプルページは手動確認で足りるため
テストを書いていません。Vuetify コンポーネント自体の動作や CSS・見た目も検証しません。

### ページテスト（`StockSearchPage.test.ts` の解説）

雛形: `src/pages/__tests__/StockSearchPage.test.ts`

ページのテストでは「composable がどう動くか」ではなく「composable の結果をページがどう扱うか」
だけを検証したいので、**composable そのものをモック**します。ポイントは、戻り値の ref を
テスト側に持っておき、**通信を偽装する代わりに ref へ直接代入して状態を作る**ことです:

```typescript
vi.mock('@/composables/queries/useStockSearch')
const mockedUseStockSearch = vi.mocked(useStockSearch)

const searchResult = ref<ProductListResponse | null>(null)
const isLoading = ref(false)
const error = ref<ApiError | null>(null)
let receivedCondition: Ref<StockSearchCondition | null>  // ページが渡した引数を捕まえる

beforeEach(() => {
  mockedUseStockSearch.mockImplementation((condition) => {
    receivedCondition = condition as Ref<StockSearchCondition | null>
    return { searchResult, isLoading, error, refetch: vi.fn() } as unknown as ReturnType<typeof useStockSearch>
  })
})
```

これで「画面の責務」3種類がそれぞれ1〜2行で検証できます:

1. **入力 → 引数の組み立て**: フォーム操作 → 検索ボタン → `receivedCondition.value` を `toEqual` で検証
   （例: スペース区切りキーワードが `['緑茶', '蜂蜜']` に分割されるか）
2. **状態 → 表示の分岐**: `isLoading.value = true` や `searchResult.value = 0件データ` を代入 →
   プログレスバー・0件メッセージ・カード・エラー表示の出し分けを検証
3. **操作 → 遷移**: カードを `trigger('click')` → `mockPush` が `/detail/1` で呼ばれたか検証
   （`vue-router` のモックは `SearchPage.test.ts:20-29` と同じイディオム）

補足:

- `v-text-field` / `v-select` は内部にローダー用の `.v-progress-linear` を常時描画しているため、
  「ローディング表示が出ているか」をクラスセレクタで探すと誤ヒットします。ページ側の対象要素に
  `data-testid` を付けて特定するのが確実です（`StockSearchPage.vue` の `data-testid="search-loading"` 参照）。
- `src/test/setup.ts` が Vuetify・Pinia・QueryClient をテスト毎に登録済みなので、mount 時のプラグイン
  追加は MainLayout 用の最小ルーターだけで足ります（雛形の `makeRouter()` 参照）。

---

## 6. ESLint に怒られたら

`src/pages/**` と `src/components/**` から `@/api`・`@tanstack/vue-query`・`axios`（`@/plugins/axios` 含む）を
直接 import すると ESLint がエラーにします（`eslint.config.js` の `no-restricted-imports` ルール）。

| 出るメッセージ | 原因 | 直し方 |
|---|---|---|
| `@/api は直接使わず、@/composables の useXxx() と @/types/api の型を使ってください（docs/guides/team-guide.md 参照）。` | ページ/コンポーネントで `@/api` から直接 `useGetXxx` や型を import した | 対応する `composables/queries` か `composables/mutations` の `useXxx()` を使う。型が欲しいだけなら `@/types/api` から import する |
| `vue-query は composables 層専用です。@/composables の useXxx() を使ってください（docs/guides/team-guide.md 参照）。` | ページ/コンポーネントで `@tanstack/vue-query` の `useQuery` / `useMutation` / `useQueryClient` を直接 import した | vue-query を直接使わず、composable 経由にする。無い場合は「3. 新しい API を使いたい」の手順で新規作成する |
| `axios は直接使わず、@/composables の useXxx() を使ってください（docs/guides/team-guide.md 参照）。` | ページ/コンポーネントで `axios` や `@/plugins/axios` を直接 import した | 同上。通信は必ず composable 経由にする |

これらのルールは `src/pages/**/*.{ts,vue}` と `src/components/**/*.{ts,vue}`（`__tests__` 配下は除く）にのみ
適用されます。`src/composables/**` の中は制限なし（ここだけが orval に触ってよい場所です）。

---

## 7. エラー処理の考え方（読むだけでOK）

ページに書くコードは変わりませんが、裏で何が起きているかを知っておくと安心です。3段構えになっています。

| 層 | 誰が書くか | 内容 |
|---|---|---|
| axios インターセプタ | 共通層（済） | 全エラーを `ApiError`（`message` / `status`）に正規化 |
| グローバル snackbar | 共通層（済） | 取得失敗・更新失敗を自動通知（`src/plugins/vueQuery.ts` の `QueryCache`/`MutationCache` の `onError`） |
| ページの `error` | あなた（任意） | フォールバック表示等、画面固有の対応をしたい時だけ使う |

詳しい図（シーケンス）と各層の責務は
[common-layer-architecture.md のエラー処理3段構え](./common-layer-architecture.md#エラー処理3段構え) を参照してください。

---

## 8. 全画面ローディング（読むだけでOK）

API 通信（vue-query の fetch/mutation）とページ遷移中は、`AppLoadingOverlay` が画面全体に
グルグル（`v-progress-circular`）を自動表示します。composable 側で表示/非表示を制御するコードを
書く必要はありません（取得系・更新系とも `isLoading`/`isSubmitting` の4点セット・3点セットは
今まで通り返すだけでOKです）。

特定のクエリだけグルグルを出したくない場合は、その `useQuery` に `meta: { globalLoading: false }` を
付けると対象外にできます。

```typescript
const query = useQuery({
  queryKey: ['xxx'],
  queryFn: fetchXxx,
  meta: { globalLoading: false }, // このクエリの通信中は全画面グルグルを出さない
})
```

**この規約は `useQuery`（取得系）専用です。`useMutation`（更新系）には現状効きません**
（除外したい更新系が出てきたら仕組みの拡張を検討してください）。

動作確認は `/sample-loading` ページ（`src/composables/queries/useLoadingSample.ts`）で行えます。
「遅い取得通信」「遅い更新通信」「ページ遷移」のボタンで、それぞれ実際にグルグルが出るところを
目視確認できます。

実装本体: `src/composables/useGlobalLoading.ts`（状態の合成ロジック）、
`src/components/ui/AppLoadingOverlay.vue`（表示コンポーネント）。

---

## よくある質問

**Q1. 同じ API を2ページで呼んだら2回通信される？**

基本的には1回だけです。vue-query は「同じキー（queryKey）」に対する呼び出しをキャッシュとして共有します。
たとえば `useProductDetail(1)` を2つのページ（あるいは同じページ内の2箇所）から呼んでも、
最初の1回だけ実際に通信し、2回目以降はキャッシュから即座に値が返ります。さらに `staleTime`（新鮮とみなす時間。
このプロジェクトでは5分、`src/plugins/vueQuery.ts` で設定）以内なら、ページを行き来しても再通信しません。
詳しい仕組みは [vue-query の考え方の入門解説](./common-layer-architecture.md#vue-query-の考え方の入門解説) を参照。

**Q2. エラー時に snackbar を出したくない**

現状、グローバル snackbar（`QueryCache` / `MutationCache` の `onError`）を個別の composable 単位で
無効化する仕組みは用意されていません。どうしても出したくない事情がある場合は、まず本当に必要か
チームに相談してください（オフラインフォールバック機構がある画面では、そもそもエラー自体を
表に出さない設計にする方が自然なことが多いです。`useMenu` / `useProductList` / `useProductDetail` の
`isFallback` パターンを参照）。

**Q3. 一覧を手動で再読み込みしたい**

取得系 composable が返す `refetch` を呼びます。

```typescript
const { productList, refetch } = useProductList(params)
// pull-to-refresh やボタンから
function onReload() {
  refetch()
}
```

**Q4. POST 成功後に一覧が古いまま**

通常は起きません。`useRegisterProduct` など更新系 composable の `onSuccess` 内で
`queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() })` を呼んでおり、
一覧ページが表示中ならバックグラウンドで自動再取得されます。それでも古く見える場合は、
更新系 composable 側の `invalidateQueries` に渡している `queryKey` が一覧側の `queryKey` と
一致しているか（前方一致するプレフィックスになっているか）を確認してください。

**Q5. 型はどこから import する？**

必ず `@/types/api` からです。

```typescript
import type { Product, GetProductsParams, MenuItem } from '@/types/api'
```

`@/api` から型を import すると ESLint エラーになります。`@/types/api` は orval が
`orval.config.ts` の `output.schemas` 設定で分離生成した型置き場で、手編集はしません。

**Q6. `isLoading` と `isFetching` は何が違う？**

`isLoading` は「初回ロード中（データがまだ一度もない状態での通信中）」だけを指します。ページ移動後の
バックグラウンド再取得中は `isLoading` は `false` のままです（画面には直前のデータが表示され続けます）。
このプロジェクトの composable は基本的に `isLoading` だけを返しているので、通常は `isLoading` を見れば
十分です。より細かい状態を知りたくなった場合は
[vue-query の考え方の入門解説](./common-layer-architecture.md#vue-query-の考え方の入門解説) と
[vue-query-architecture.md](../reference/vue-query-architecture.md) の状態機械の図を参照してください。

**Q7. composable を作ったが `npm run orval` を実行し忘れて型が無いと言われる**

`src/types/api/` や `src/api/index.ts` に該当のフック・型が無いとインポートエラーになります。
`openapi/api.yaml` を編集した後は必ず `npm run orval` を実行してから composable を書いてください
（「3. 新しい API を使いたい」の Step 2）。

---

## 関連資料

- [共通層の考え方とアーキテクチャ](./common-layer-architecture.md) — なぜこの形にしたかの設計意図・データフロー・エラー処理の全体像
- [共通層設計スペック](../superpowers/specs/2026-07-06-team-common-layer-design.md) — このガイドの元になった設計検討の詳細
- [vue-query-architecture.md](../reference/vue-query-architecture.md) — vue-query 自体のより詳しい解説（QueryClient・QueryKey・状態機械など）
