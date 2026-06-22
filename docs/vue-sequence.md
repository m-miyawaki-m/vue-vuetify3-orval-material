# Vue 3 概念・フロー シーケンス図

---

## 1. コンポーネントのライフサイクル

```plantuml
@startuml lifecycle
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC
skinparam SequenceGroupBorderColor #546E7A
skinparam SequenceGroupFontColor #90CAF9

actor ユーザー as user
participant "Vue Router" as router
participant "コンポーネント\n(script setup)" as comp
participant "DOM" as dom

user -> router : URL に遷移 (push / goto)
router -> comp : コンポーネント生成

group セットアップフェーズ（同期）
  comp -> comp : ref / reactive / computed 作成
  comp -> comp : watch 登録
  note right : onBeforeMount 相当のタイミング
end

comp -> dom : 仮想 DOM を生成・マウント

group マウント後フェーズ
  comp -> comp : onMounted() 実行
  note right
    API 呼び出し
    カメラ起動 (useBarcodeScanner)
    pendingResult 消費 (BarcodeInputField)
    DOM への直接アクセス (videoRef.value)
  end note
end

group リアクティブ更新サイクル
  user -> comp : 操作（入力・クリック）
  comp -> comp : ref.value 変更
  comp -> dom : 差分更新（必要な箇所だけ）
  note right : nextTick() でこの後に処理を差し込める
end

group コンポーネント破棄
  router -> comp : 別ルートに遷移
  comp -> comp : onUnmounted() 実行
  note right
    カメラ停止 stop()
    タイマークリア
    イベントリスナー解除
  end note
  comp -> dom : DOM から除去
end

@enduml
```

---

## 2. ref / computed / watch の連鎖

```plantuml
@startuml reactivity
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "ユーザー操作" as user
participant "ref\n(keyword)" as kw
participant "computed\n(filteredProducts)" as fp
participant "computed\n(pagedProducts)" as pp
participant "watch\n(params)" as watcher
participant "テンプレート\n(DOM)" as dom
participant "API / Store" as api

note over kw, dom
  プロジェクト例: ProductListPage.vue
end note

user -> kw : keyword.value = '緑茶'

kw -> fp : 依存が変わったので再計算
fp -> fp : products.filter(キーワードで絞り込み)
fp -> pp : filteredProducts が変わったので再計算
pp -> pp : slice(start, start + PAGE_SIZE)

kw -> dom : テンプレートの {{ keyword }} を更新
fp -> dom : 件数表示 {{ filteredProducts.length }} を更新
pp -> dom : v-for のカード一覧を再描画

note right of dom
  変わった箇所だけ差分更新
  （仮想 DOM の diff アルゴリズム）
end note

user -> kw : currentPage.value = 2

kw -> watcher : params computed が変化 → watch 発火
watcher -> api : getProducts({ page: 2, q: '緑茶' })
api --> watcher : ProductListResponse
watcher -> dom : data.value 更新 → 一覧再描画

@enduml
```

---

## 3. Props / Emits（親子コンポーネント通信）

```plantuml
@startuml props-emits
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "DetailPage\n(親)" as parent
participant "SelectPickerField\n(子)" as child
participant "v-dialog\n(孫)" as dialog

note over parent, child
  <SelectPickerField v-model="localLocation" :items="locationItems" />
  展開すると:
  :model-value="localLocation"
  @update:model-value="localLocation = $event"
end note

parent -> child : props.modelValue = 'A棚-1'\nprops.items = ['A棚-1', 'A棚-2', ...]

child -> child : テンプレートに反映\n(v-text-field の値が 'A棚-1')

note right of child : 親→子の通信は Props（一方向）

parent --> parent : localLocation = 'A棚-1'\nとして表示されている

group ユーザーがドロップダウンを開く
  parent -> child : （操作）
  child -> dialog : open.value = true
  dialog --> child : ダイアログ表示
end

group ユーザーが 'A棚-2' を選択
  dialog -> child : select('A棚-2')
  child -> child : open.value = false
  child -> parent : emit('update:modelValue', 'A棚-2')
  note right : 子→親の通信は emit（イベント）
  parent -> parent : localLocation = 'A棚-2'
  parent -> child : props.modelValue = 'A棚-2' として再伝達
end

@enduml
```

---

## 4. v-model の双方向バインディング詳細

```plantuml
@startuml vmodel
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "親\n(keyword = ref(''))" as parent
participant "v-text-field\n(Vuetify)" as input
participant "DOM\n<input>" as dom

note over parent, dom
  <v-text-field v-model="keyword" />
  内部的には:
  :model-value="keyword"
  @update:model-value="keyword = $event"
end note

parent -> input : :model-value="keyword" で初期値を渡す
input -> dom : value 属性にセット

group ユーザーが文字を入力
  dom -> input : @input イベント発生
  input -> parent : emit('update:model-value', '緑茶')
  parent -> parent : keyword.value = '緑茶'
  note right : Vue のリアクティブ更新
  parent -> input : :model-value = '緑茶' で再バインド
  input -> dom : input の value を '緑茶' に同期
end

group プログラムから値を変更
  parent -> parent : keyword.value = ''（クリア）
  parent -> input : :model-value = '' で更新
  input -> dom : input の value を '' に同期
end

@enduml
```

---

## 5. スロットの描画フロー

```plantuml
@startuml slots
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "DetailPage\n(使う側)" as page
participant "SubLayout\n(定義側)" as layout
participant "DOM" as dom

note over page, layout
  SubLayout はフレームを定義し、
  中身は親（DetailPage）が差し込む
end note

page -> layout : #actions スロットの内容を渡す\n（エラー履歴ボタン）
page -> layout : #footer スロットの内容を渡す\n（登録ボタン）
page -> layout : default スロットの内容を渡す\n（v-container のメインコンテンツ）

layout -> layout : $slots.actions が存在するか確認
layout -> dom : v-app-bar の append に\nactions スロット内容を挿入

layout -> layout : $slots.footer が存在するか確認
layout -> dom : v-bottom-navigation に\nfooter スロット内容を挿入

layout -> dom : v-main の中に\ndefault スロット内容を挿入

note over dom
  最終的な DOM 構造:
  ┌─ v-app-bar ────────────────────┐
  │  ← 戻る  タイトル  [エラーBtn]  │  ← actions slot
  └─────────────────────────────────┘
  ┌─ v-main ───────────────────────┐
  │  v-container（メインコンテンツ）  │  ← default slot
  └─────────────────────────────────┘
  ┌─ v-bottom-navigation ──────────┐
  │  [エラー履歴]  [登録]           │  ← footer slot
  └─────────────────────────────────┘
end note

@enduml
```

---

## 6. Pinia Store の状態更新フロー

```plantuml
@startuml pinia
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "ComponentA\n(MainMenuPage)" as ca
participant "ComponentB\n(QuickMenuPage)" as cb
participant "useMainMenuStore\n(Pinia)" as store
participant "API / fallback" as api
participant "localStorage\n(persist)" as storage

note over ca, storage
  Pinia は全コンポーネントで同じインスタンスを共有する
end note

ca -> store : useMainMenuStore()（インスタンス取得）
cb -> store : useMainMenuStore()（同じインスタンス）

ca -> store : fetchMenu() 呼び出し
store -> store : isLoading.value = true

store -> api : GET /menu
alt 成功
  api --> store : MenuItem[]
  store -> store : items.value = MenuItem[]
  store -> store : isLoading.value = false
else 失敗
  api --> store : Error
  store -> store : items.value = fallbackData
  store -> store : isError.value = true
  store -> store : isLoading.value = false
end

store -> ca : items が変化 → computed / template が自動更新
store -> cb : 同じ items を参照しているため同時に更新

note over store, storage
  persist: true の store は
  state が変わるたびに localStorage に自動保存
  （useMemoStore, useMenuStore, useWorkSessionStore など）
end note

store -> storage : JSON.stringify(state) を自動保存
storage -> store : 次回アプリ起動時に自動復元

@enduml
```

---

## 7. Composable（useAsync）の呼び出しフロー

```plantuml
@startuml composable
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "ProductListPage" as page
participant "useAsync()" as ua
participant "getProducts()" as api
participant "テンプレート" as tmpl

page -> ua : useAsync(() => getProducts(params), params)
note right
  第2引数 params を watch して
  変化するたびに第1引数の fn を再実行
end note

ua -> ua : data = ref(null)\nisLoading = ref(false)\nisError = ref(false)
ua -> ua : watch(params, execute, { immediate: true })

ua -> ua : execute()（即時実行）
ua -> ua : isLoading.value = true
ua -> api : getProducts({ q, category, page, pageSize })
tmpl <- ua : isLoading=true → v-progress-linear 表示

alt 成功
  api --> ua : ProductListResponse
  ua -> ua : data.value = response
  ua -> ua : isLoading.value = false
  ua -> tmpl : data 更新 → 商品カード一覧描画
else 失敗
  api --> ua : throw Error
  ua -> ua : isError.value = true
  ua -> ua : isLoading.value = false
  ua -> tmpl : isError=true → フォールバックで表示
end

page -> page : currentPage.value++ （ページ変更）
page -> page : params computed が変化
params -> ua : watch が検知
ua -> ua : execute() 再実行
ua -> api : getProducts({ page: 2, ... })

@enduml
```

---

## 8. Vue Router のナビゲーションフロー

```plantuml
@startuml router
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

actor ユーザー as user
participant "SearchPage" as sp
participant "Vue Router" as router
participant "ProductListPage" as plp
participant "DetailPage" as dp

user -> sp : 検索ボタン押下
sp -> router : push({ path: '/products', query: { q: '緑茶' } })

router -> sp : onUnmounted() をトリガー（SearchPage 破棄）
note right of sp : SearchPage の ref・computed・watch が解放される

router -> plp : コンポーネント生成・マウント
plp -> plp : script setup 実行\nref / computed 作成
plp -> plp : watch(params, execute, { immediate: true })
plp -> plp : onMounted()（必要なら）

note over router
  Hash History モード (#/products?q=緑茶)
  ブラウザの戻るボタンでも戻れる
end note

user -> plp : カードをクリック
plp -> router : push('/detail/1')

router -> plp : onUnmounted()（ProductListPage 破棄）
router -> dp : DetailPage 生成・マウント
dp -> dp : props.id = '1'
dp -> dp : onMounted() → pendingResult チェック

user -> dp : 戻るボタン
dp -> router : back()
router -> dp : onUnmounted()（DetailPage 破棄）
router -> plp : ProductListPage 再生成・マウント

note right of plp
  router.back() で戻ったとき
  ProductListPage は再マウントされる
  （キャッシュなし）
  → onMounted が再実行される
end note

@enduml
```

---

## 9. $attrs / inheritAttrs の透過フロー

```plantuml
@startuml attrs
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "DetailPage\n(使う側)" as parent
participant "SelectPickerField\n(inheritAttrs: false)" as spf
participant "v-text-field\n(v-bind=$attrs)" as vtf
participant "v-dialog" as vd

parent -> spf : <SelectPickerField\n  v-model="localLocation"\n  :error="true"\n  :error-messages="'必須です'"\n/>

note over spf
  defineProps で宣言した
  modelValue, label, items 以外は
  すべて $attrs に入る
  → error, error-messages が $attrs に入る
end note

spf -> spf : inheritAttrs: false なので\n自動継承されない

spf -> vtf : v-bind="$attrs" で明示的に渡す\n→ error と error-messages が v-text-field に渡る

vtf -> vtf : エラーボーダーと\nエラーメッセージを表示

spf -> vd : $attrs は渡さない\n（ダイアログにエラー表示は不要）

note over vtf
  inheritAttrs: false + v-bind="$attrs" の目的:
  複数のルート要素があるとき、
  どの要素に attrs を適用するかを
  自分で制御する
end note

@enduml
```

---

## 10. watch の即時実行と依存追跡

```plantuml
@startuml watch-flow
skinparam DefaultFontName "Noto Sans JP"
skinparam BackgroundColor #1e1e1e
skinparam SequenceArrowColor #90CAF9
skinparam SequenceParticipantBorderColor #1565C0
skinparam SequenceParticipantBackgroundColor #0D1B2A
skinparam SequenceParticipantFontColor #E0E0E0
skinparam NoteBackgroundColor #37474F
skinparam NoteBorderColor #546E7A
skinparam NoteTextColor #CFD8DC

participant "DetailPage" as page
participant "ref(product)" as prod
participant "watch(product)" as watcher
participant "ref(localMemo)" as memo
participant "useMemoStore" as store

page -> page : コンポーネントマウント

page -> watcher : watch(product, handler, { immediate: true }) 登録

note right of watcher
  immediate: true があるため
  マウント直後に handler を1回実行する
end note

watcher -> prod : product の現在値を読む
watcher -> store : memoStore.getMemo(product.id)
store --> watcher : '保存済みメモ'
watcher -> memo : localMemo.value = '保存済みメモ'

note over page, memo
  ユーザーが別の商品ページへ遷移して戻ると
  product が変わるため watch が再実行される
end note

page -> prod : route.params.id が変化\n→ product computed が再計算
prod -> watcher : 依存が変化 → handler 再実行
watcher -> store : memoStore.getMemo(新しいproduct.id)
store --> watcher : ''（新しい商品のメモ）
watcher -> memo : localMemo.value = ''

@enduml
```
