# UI コンポーネント分離 設計書

**作成日**: 2026-06-18
**対象プロジェクト**: vue-vuetify3-orval-material (Vue 3 + Vuetify 4 + Capacitor 7)

---

## 概要

`ComponentSamplePage.vue` に直書きされている日付・時刻ピッカーのダイアログロジックを独立コンポーネントに抽出し、他のページから `v-model` だけで再利用できるようにする。あわせて `useSnackbar()` composable を作成し、どのページからでも1行でトースト通知を出せるようにする。

---

## 要件

- 6つの日付・時刻ピッカーコンポーネントを新規作成する
- 各コンポーネントはダイアログの開閉・一時値・確定ロジックをすべて内部で管理する
- ページ側のインターフェースは `v-model` のみ（DatePickerField, TimePickerField 系）または `v-model:start` + `v-model:end`（Range 系）
- `useSnackbar()` composable と `AppSnackbar.vue` を作成し、`App.vue` に1か所配置する
- `ComponentSamplePage.vue` を新コンポーネントを使う形に書き換える
- `script setup` の refs・functions が大幅に削減されること

---

## ファイル構成

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/components/ui/DatePickerField.vue` | 新規 | 単一日付選択フィールド |
| `src/components/ui/DateRangePickerField.vue` | 新規 | 期間選択フィールド |
| `src/components/ui/TimePickerField.vue` | 新規 | 単一時刻選択フィールド（Vuetify 標準） |
| `src/components/ui/TimeRangePickerField.vue` | 新規 | 時間範囲選択フィールド（Vuetify 標準） |
| `src/components/ui/TimeWheelPickerField.vue` | 新規 | 単一時刻選択フィールド（ホイール） |
| `src/components/ui/TimeWheelRangePickerField.vue` | 新規 | 時間範囲選択フィールド（ホイール） |
| `src/components/ui/AppSnackbar.vue` | 新規 | グローバルスナックバー表示コンポーネント |
| `src/composables/useSnackbar.ts` | 新規 | スナックバー composable |
| `src/App.vue` | 変更 | `<AppSnackbar />` を追加 |
| `src/pages/ComponentSamplePage.vue` | 変更 | 新コンポーネントを使う形に書き換え |

---

## コンポーネント詳細仕様

### DatePickerField.vue

**インターフェース:**
```vue
<DatePickerField v-model="date" label="日付を選択" />
```

| props | 型 | 説明 |
|---|---|---|
| `modelValue` | `Date \| null` | 選択された日付 |
| `label` | `string` | テキストフィールドのラベル |

| emits | 型 |
|---|---|
| `update:modelValue` | `Date \| null` |

**内部動作:**
- テキストフィールドのアイコン（`mdi-calendar`）タップでダイアログを開く
- `v-date-picker` で日付を選択、OK で確定・キャンセルで破棄
- 表示フォーマット: `yyyy/mm/dd`

---

### DateRangePickerField.vue

**インターフェース:**
```vue
<DateRangePickerField
  v-model:start="rangeStart"
  v-model:end="rangeEnd"
  label-start="開始日"
  label-end="終了日"
/>
```

| props | 型 | デフォルト |
|---|---|---|
| `start` | `Date \| null` | - |
| `end` | `Date \| null` | - |
| `labelStart` | `string` | `"開始日"` |
| `labelEnd` | `string` | `"終了日"` |

| emits | 型 |
|---|---|
| `update:start` | `Date \| null` |
| `update:end` | `Date \| null` |

**内部動作:**
- 開始・終了テキストフィールド + カレンダーアイコンボタンで1つのダイアログを開く
- `v-date-picker multiple="range"` で期間選択
- 先頭要素が start、末尾要素が end
- クリア・キャンセル・OK ボタンあり

---

### TimePickerField.vue

**インターフェース:**
```vue
<TimePickerField v-model="time" label="時刻を選択" />
```

| props | 型 |
|---|---|
| `modelValue` | `string \| null` (HH:mm) |
| `label` | `string` |

| emits | 型 |
|---|---|
| `update:modelValue` | `string \| null` |

**内部動作:**
- `mdi-clock-outline` アイコンでダイアログを開く
- `v-time-picker format="24hr"` で選択

---

### TimeRangePickerField.vue

**インターフェース:**
```vue
<TimeRangePickerField v-model:start="startTime" v-model:end="endTime" />
```

| props | 型 | デフォルト |
|---|---|---|
| `start` | `string \| null` | - |
| `end` | `string \| null` | - |
| `labelStart` | `string` | `"開始時刻"` |
| `labelEnd` | `string` | `"終了時刻"` |

| emits | 型 |
|---|---|
| `update:start` | `string \| null` |
| `update:end` | `string \| null` |

**内部動作:**
- 2ステップダイアログ（開始 → 終了）
- 終了の `v-time-picker` に `:min="start"` を渡す
- 「次へ」→「OK」の2段階確定

---

### TimeWheelPickerField.vue

**インターフェース:**
```vue
<TimeWheelPickerField v-model="time" label="時刻を選択" />
```

`TimePickerField` と同じ props/emits。内部の `v-time-picker` を `TimeWheelPicker` に置き換えた構造。

---

### TimeWheelRangePickerField.vue

**インターフェース:**
```vue
<TimeWheelRangePickerField v-model:start="startTime" v-model:end="endTime" />
```

`TimeRangePickerField` と同じ props/emits。内部を `TimeWheelPicker` に置き換えた構造。

---

### useSnackbar.ts + AppSnackbar.vue

**useSnackbar:**
```ts
// モジュールスコープのリアクティブ状態（シングルトン）
const state = reactive({ show: false, color: 'success', text: '', icon: '' })

export function useSnackbar() {
  function showSnack(color: 'success' | 'error' | 'info', text: string): void
  return { state, showSnack }
}
```

アイコンマップ:
- `success` → `mdi-check-circle`
- `error` → `mdi-alert-circle`
- `info` → `mdi-information`

タイムアウト: 2500ms

**AppSnackbar.vue:**
- `useSnackbar()` の `state` を購読して `v-snackbar` を表示するだけ
- `App.vue` に `<AppSnackbar />` を1か所置く

---

## ComponentSamplePage の変化

### 入力・選択タブ（カレンダー・時刻部分）

**Before（抜粋）:**
```vue
<v-text-field :model-value="selectedDate ? formatDate(selectedDate) : ''" ... >
  <template #append-inner>
    <v-btn @click="openSingle" ... />
  </template>
</v-text-field>
<v-dialog v-model="singleDialog">
  <v-date-picker v-model="tempDate" ... />
  <v-card-actions>...</v-card-actions>
</v-dialog>
<!-- + ref × 4, function × 3 -->
```

**After:**
```vue
<DatePickerField v-model="selectedDate" label="日付を選択" />
```

### 通知タブ

**Before:**
```vue
<v-btn @click="showSnack('success', '保存しました')">成功</v-btn>
<!-- + snackbar, snackColor, snackText, snackIcon refs -->
<!-- + showSnack function -->
<!-- + <v-snackbar> テンプレート -->
```

**After:**
```vue
<v-btn @click="showSnack('success', '保存しました')">成功</v-btn>
<!-- script: const { showSnack } = useSnackbar() のみ -->
```

---

## スコープ外

- BottomSheet（アクションシート）のコンポーネント化（各ページで内容が異なるため）
- ラジオボタン・トグル・プルダウンのラッパー（Vuetify 標準コンポーネントで十分）
- 表示制御（v-if/v-show/v-menu）のコンポーネント化（コードパターンであって部品ではない）
- フォームダイアログ・フルスクリーンダイアログの汎用化（BaseDialog を使う使用例のまま）
