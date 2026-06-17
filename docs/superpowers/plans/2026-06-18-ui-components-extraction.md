# UI コンポーネント分離 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ComponentSamplePage.vue` の日付・時刻ピッカーとスナックバーを独立コンポーネントに抽出し、`v-model` だけで再利用できる形にする。

**Architecture:** 日付・時刻ピッカー6種をそれぞれ `src/components/ui/` に配置し、ダイアログ開閉ロジックをコンポーネント内に閉じ込める。スナックバーはモジュールスコープのリアクティブ状態（シングルトン）を持つ `useSnackbar` composable + `AppSnackbar.vue` として実装し、`App.vue` に1か所配置する。

**Tech Stack:** Vue 3.5 (Composition API `<script setup lang="ts">`), Vuetify 4.0.2, TypeScript

---

## File Map

| ファイル | 操作 | 役割 |
|---|---|---|
| `src/composables/useSnackbar.ts` | 新規作成 | スナックバー状態シングルトン + showSnack() |
| `src/components/ui/AppSnackbar.vue` | 新規作成 | useSnackbar の state を v-snackbar にバインド |
| `src/App.vue` | 変更 | `<AppSnackbar />` を `<v-app>` 内に追加 |
| `src/components/ui/DatePickerField.vue` | 新規作成 | 単一日付選択フィールド |
| `src/components/ui/DateRangePickerField.vue` | 新規作成 | 期間選択フィールド |
| `src/components/ui/TimePickerField.vue` | 新規作成 | 単一時刻選択フィールド（Vuetify 標準） |
| `src/components/ui/TimeRangePickerField.vue` | 新規作成 | 時間範囲選択フィールド（Vuetify 標準） |
| `src/components/ui/TimeWheelPickerField.vue` | 新規作成 | 単一時刻選択フィールド（ホイール） |
| `src/components/ui/TimeWheelRangePickerField.vue` | 新規作成 | 時間範囲選択フィールド（ホイール） |
| `src/pages/ComponentSamplePage.vue` | 変更 | 新コンポーネントを使う形に書き換え |

---

## Task 1: useSnackbar composable + AppSnackbar + App.vue

**Files:**
- Create: `src/composables/useSnackbar.ts`
- Create: `src/components/ui/AppSnackbar.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: `src/composables/useSnackbar.ts` を作成する**

```ts
import { reactive } from 'vue'

const ICON_MAP = {
  success: 'mdi-check-circle',
  error:   'mdi-alert-circle',
  info:    'mdi-information',
} as const

type SnackColor = keyof typeof ICON_MAP

const state = reactive({
  show:  false,
  color: 'success' as SnackColor,
  text:  '',
  icon:  ICON_MAP.success,
})

export function useSnackbar() {
  function showSnack(color: SnackColor, text: string) {
    state.color = color
    state.text  = text
    state.icon  = ICON_MAP[color]
    state.show  = true
  }
  return { state, showSnack }
}
```

- [ ] **Step 2: `src/components/ui/AppSnackbar.vue` を作成する**

```vue
<template>
  <v-snackbar v-model="state.show" :color="state.color" :timeout="2500" location="bottom">
    <v-icon start>{{ state.icon }}</v-icon>{{ state.text }}
    <template #actions>
      <v-btn variant="text" @click="state.show = false">閉じる</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { useSnackbar } from '@/composables/useSnackbar'
const { state } = useSnackbar()
</script>
```

- [ ] **Step 3: `src/App.vue` を修正して `<AppSnackbar />` を追加する**

現在の `src/App.vue` の `<template>` 部分：
```vue
<template>
  <div class="phone-wrapper">
    <v-app :theme="themeStore.currentTheme" class="phone-app">
      <router-view />
    </v-app>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
const themeStore = useThemeStore()
</script>
```

変更後（`<AppSnackbar />` と import を追加）：
```vue
<template>
  <div class="phone-wrapper">
    <v-app :theme="themeStore.currentTheme" class="phone-app">
      <router-view />
      <AppSnackbar />
    </v-app>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import AppSnackbar from '@/components/ui/AppSnackbar.vue'
const themeStore = useThemeStore()
</script>
```

（`<style>` ブロックはそのまま変更しない）

- [ ] **Step 4: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 5: コミットする**

```bash
git add src/composables/useSnackbar.ts src/components/ui/AppSnackbar.vue src/App.vue
git commit -m "feat(ui): add useSnackbar composable and AppSnackbar"
```

---

## Task 2: DatePickerField

**Files:**
- Create: `src/components/ui/DatePickerField.vue`

- [ ] **Step 1: `src/components/ui/DatePickerField.vue` を作成する**

```vue
<template>
  <v-text-field
    :model-value="modelValue ? formatDate(modelValue) : ''"
    :label="label"
    variant="outlined"
    readonly
    placeholder="yyyy/mm/dd"
  >
    <template #append-inner>
      <v-btn icon="mdi-calendar" variant="text" density="compact" @click="open" />
    </template>
  </v-text-field>

  <v-dialog v-model="dialog" max-width="360">
    <v-card>
      <v-card-title class="pt-4 pl-4">日付を選択</v-card-title>
      <v-date-picker v-model="temp" color="primary" show-adjacent-months elevation="0" />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
        <v-btn color="primary" variant="elevated" @click="confirm">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: Date | null
  label: string
}>()
const emit = defineEmits<{ 'update:modelValue': [Date | null] }>()

const dialog = ref(false)
const temp   = ref<Date | null>(null)

function open() {
  temp.value = props.modelValue
  dialog.value = true
}

function confirm() {
  emit('update:modelValue', temp.value)
  dialog.value = false
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 3: コミットする**

```bash
git add src/components/ui/DatePickerField.vue
git commit -m "feat(ui): add DatePickerField component"
```

---

## Task 3: DateRangePickerField

**Files:**
- Create: `src/components/ui/DateRangePickerField.vue`

- [ ] **Step 1: `src/components/ui/DateRangePickerField.vue` を作成する**

```vue
<template>
  <div>
    <div class="d-flex align-center gap-2 mb-1">
      <v-text-field
        :model-value="start ? formatDate(start) : ''"
        :label="labelStart"
        variant="outlined"
        readonly
        placeholder="yyyy/mm/dd"
        hide-details
        style="flex:1"
      />
      <span class="text-body-2 mx-1">〜</span>
      <v-text-field
        :model-value="end ? formatDate(end) : ''"
        :label="labelEnd"
        variant="outlined"
        readonly
        placeholder="yyyy/mm/dd"
        hide-details
        style="flex:1"
      />
      <v-btn icon="mdi-calendar-range" variant="tonal" color="primary" class="ml-1" @click="open" />
    </div>

    <v-dialog v-model="dialog" max-width="360">
      <v-card>
        <v-card-title class="pt-4 pl-4">期間を選択</v-card-title>
        <v-card-subtitle class="pb-0 pl-4">
          {{ temp.length === 0 ? '開始日をタップ' : temp.length === 1 ? '終了日をタップ' : '期間が選択されました' }}
        </v-card-subtitle>
        <v-date-picker v-model="temp" color="primary" show-adjacent-months multiple="range" elevation="0" />
        <v-card-actions>
          <v-btn variant="text" @click="temp = []">クリア</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="temp.length < 2"
            @click="confirm"
          >OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  start:      Date | null
  end:        Date | null
  labelStart?: string
  labelEnd?:   string
}>(), {
  labelStart: '開始日',
  labelEnd:   '終了日',
})

const emit = defineEmits<{
  'update:start': [Date | null]
  'update:end':   [Date | null]
}>()

const dialog = ref(false)
const temp   = ref<Date[]>([])

function open() {
  temp.value = [props.start, props.end].filter(Boolean) as Date[]
  dialog.value = true
}

function confirm() {
  emit('update:start', temp.value[0] ?? null)
  emit('update:end',   temp.value[temp.value.length - 1] ?? null)
  dialog.value = false
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 3: コミットする**

```bash
git add src/components/ui/DateRangePickerField.vue
git commit -m "feat(ui): add DateRangePickerField component"
```

---

## Task 4: TimePickerField

**Files:**
- Create: `src/components/ui/TimePickerField.vue`

- [ ] **Step 1: `src/components/ui/TimePickerField.vue` を作成する**

```vue
<template>
  <v-text-field
    :model-value="modelValue ?? ''"
    :label="label"
    variant="outlined"
    readonly
    placeholder="HH:mm"
  >
    <template #append-inner>
      <v-btn icon="mdi-clock-outline" variant="text" density="compact" @click="open" />
    </template>
  </v-text-field>

  <v-dialog v-model="dialog" max-width="360">
    <v-card>
      <v-card-title class="pt-4 px-4">時刻を選択</v-card-title>
      <div class="d-flex justify-center py-2">
        <v-time-picker v-model="temp" format="24hr" color="primary" elevation="0" />
      </div>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
        <v-btn color="primary" variant="elevated" @click="confirm">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string | null
  label:      string
}>()
const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const dialog = ref(false)
const temp   = ref<string | null>(null)

function open() {
  temp.value = props.modelValue
  dialog.value = true
}

function confirm() {
  emit('update:modelValue', temp.value)
  dialog.value = false
}
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 3: コミットする**

```bash
git add src/components/ui/TimePickerField.vue
git commit -m "feat(ui): add TimePickerField component"
```

---

## Task 5: TimeRangePickerField

**Files:**
- Create: `src/components/ui/TimeRangePickerField.vue`

- [ ] **Step 1: `src/components/ui/TimeRangePickerField.vue` を作成する**

```vue
<template>
  <div>
    <div class="d-flex align-center gap-2">
      <v-text-field
        :model-value="start ?? ''"
        :label="labelStart"
        variant="outlined"
        readonly
        placeholder="HH:mm"
        hide-details
        style="flex:1"
      />
      <span class="text-body-2 mx-1">〜</span>
      <v-text-field
        :model-value="end ?? ''"
        :label="labelEnd"
        variant="outlined"
        readonly
        placeholder="HH:mm"
        hide-details
        style="flex:1"
      />
      <v-btn icon="mdi-clock-start" variant="tonal" color="primary" class="ml-1" @click="open" />
    </div>

    <v-dialog v-model="dialog" max-width="360">
      <v-card>
        <v-card-title class="pt-4 px-4">
          {{ step === 'start' ? '開始時刻を選択' : '終了時刻を選択' }}
        </v-card-title>
        <div class="d-flex justify-center py-2">
          <v-time-picker
            v-if="step === 'start'"
            v-model="tempStart"
            format="24hr" color="primary" elevation="0"
          />
          <v-time-picker
            v-else
            v-model="tempEnd"
            format="24hr" color="primary" elevation="0"
            :min="tempStart ?? undefined"
          />
        </div>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
          <v-btn
            v-if="step === 'start'"
            color="primary" variant="elevated"
            :disabled="!tempStart"
            @click="step = 'end'"
          >次へ</v-btn>
          <v-btn
            v-else
            color="primary" variant="elevated"
            :disabled="!tempEnd"
            @click="confirm"
          >OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  start:       string | null
  end:         string | null
  labelStart?: string
  labelEnd?:   string
}>(), {
  labelStart: '開始時刻',
  labelEnd:   '終了時刻',
})

const emit = defineEmits<{
  'update:start': [string | null]
  'update:end':   [string | null]
}>()

const dialog    = ref(false)
const step      = ref<'start' | 'end'>('start')
const tempStart = ref<string | null>(null)
const tempEnd   = ref<string | null>(null)

function open() {
  tempStart.value = props.start
  tempEnd.value   = props.end
  step.value      = 'start'
  dialog.value    = true
}

function confirm() {
  emit('update:start', tempStart.value)
  emit('update:end',   tempEnd.value)
  dialog.value = false
}
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 3: コミットする**

```bash
git add src/components/ui/TimeRangePickerField.vue
git commit -m "feat(ui): add TimeRangePickerField component"
```

---

## Task 6: TimeWheelPickerField

**Files:**
- Create: `src/components/ui/TimeWheelPickerField.vue`

`TimeWheelPicker.vue` は `src/components/ui/TimeWheelPicker.vue` に既に存在する。

- [ ] **Step 1: `src/components/ui/TimeWheelPickerField.vue` を作成する**

```vue
<template>
  <v-text-field
    :model-value="modelValue ?? ''"
    :label="label"
    variant="outlined"
    readonly
    placeholder="HH:mm"
  >
    <template #append-inner>
      <v-btn icon="mdi-clock-outline" variant="text" density="compact" @click="open" />
    </template>
  </v-text-field>

  <v-dialog v-model="dialog" max-width="320">
    <v-card>
      <v-card-title class="pt-4 px-4">時刻を選択</v-card-title>
      <v-card-text class="pb-0">
        <TimeWheelPicker v-model="temp" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
        <v-btn color="primary" variant="elevated" @click="confirm">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TimeWheelPicker from '@/components/ui/TimeWheelPicker.vue'

const props = defineProps<{
  modelValue: string | null
  label:      string
}>()
const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const dialog = ref(false)
const temp   = ref<string | null>(null)

function open() {
  temp.value = props.modelValue
  dialog.value = true
}

function confirm() {
  emit('update:modelValue', temp.value)
  dialog.value = false
}
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 3: コミットする**

```bash
git add src/components/ui/TimeWheelPickerField.vue
git commit -m "feat(ui): add TimeWheelPickerField component"
```

---

## Task 7: TimeWheelRangePickerField

**Files:**
- Create: `src/components/ui/TimeWheelRangePickerField.vue`

- [ ] **Step 1: `src/components/ui/TimeWheelRangePickerField.vue` を作成する**

```vue
<template>
  <div>
    <div class="d-flex align-center gap-2">
      <v-text-field
        :model-value="start ?? ''"
        :label="labelStart"
        variant="outlined"
        readonly
        placeholder="HH:mm"
        hide-details
        style="flex:1"
      />
      <span class="text-body-2 mx-1">〜</span>
      <v-text-field
        :model-value="end ?? ''"
        :label="labelEnd"
        variant="outlined"
        readonly
        placeholder="HH:mm"
        hide-details
        style="flex:1"
      />
      <v-btn icon="mdi-clock-start" variant="tonal" color="primary" class="ml-1" @click="open" />
    </div>

    <v-dialog v-model="dialog" max-width="320">
      <v-card>
        <v-card-title class="pt-4 px-4">
          {{ step === 'start' ? '開始時刻を選択' : '終了時刻を選択' }}
        </v-card-title>
        <v-card-text class="pb-0">
          <TimeWheelPicker v-if="step === 'start'" v-model="tempStart" />
          <TimeWheelPicker v-else                  v-model="tempEnd"   />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
          <v-btn
            v-if="step === 'start'"
            color="primary" variant="elevated"
            :disabled="!tempStart"
            @click="step = 'end'"
          >次へ</v-btn>
          <v-btn
            v-else
            color="primary" variant="elevated"
            :disabled="!tempEnd"
            @click="confirm"
          >OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TimeWheelPicker from '@/components/ui/TimeWheelPicker.vue'

const props = withDefaults(defineProps<{
  start:       string | null
  end:         string | null
  labelStart?: string
  labelEnd?:   string
}>(), {
  labelStart: '開始時刻',
  labelEnd:   '終了時刻',
})

const emit = defineEmits<{
  'update:start': [string | null]
  'update:end':   [string | null]
}>()

const dialog    = ref(false)
const step      = ref<'start' | 'end'>('start')
const tempStart = ref<string | null>(null)
const tempEnd   = ref<string | null>(null)

function open() {
  tempStart.value = props.start
  tempEnd.value   = props.end
  step.value      = 'start'
  dialog.value    = true
}

function confirm() {
  emit('update:start', tempStart.value)
  emit('update:end',   tempEnd.value)
  dialog.value = false
}
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 3: コミットする**

```bash
git add src/components/ui/TimeWheelRangePickerField.vue
git commit -m "feat(ui): add TimeWheelRangePickerField component"
```

---

## Task 8: ComponentSamplePage.vue リファクタ

**Files:**
- Modify: `src/pages/ComponentSamplePage.vue`

新コンポーネントをすべて使う形に書き換える。カレンダーと時刻の `v-dialog` 8個、関連 ref 20個、関連 function 10個を削除し、スナックバー実装も削除する。

- [ ] **Step 1: `src/pages/ComponentSamplePage.vue` を以下の内容で完全に書き換える**

```vue
<template>
  <SubLayout title="コンポーネントサンプル">
    <div class="sample-layout">
      <div class="sample-tabs">
        <v-tabs v-model="activeTab" color="primary" align-tabs="start">
          <v-tab value="input">入力・選択</v-tab>
          <v-tab value="display">表示制御</v-tab>
          <v-tab value="dialog">ダイアログ</v-tab>
          <v-tab value="notification">通知</v-tab>
          <v-tab value="scanner">スキャナー</v-tab>
        </v-tabs>
      </div>
      <div class="sample-content">
        <v-window v-model="activeTab">

          <!-- ===== 入力・選択 ===== -->
          <v-window-item value="input">
            <v-container class="pb-8">

              <!-- ラジオボタン -->
              <section class="mb-8">
                <p class="text-overline text-medium-emphasis mb-2">ラジオボタン</p>
                <v-radio-group v-model="radioValue" label="配送方法を選択" color="primary">
                  <v-radio label="通常配送（3〜5日）"    value="standard" />
                  <v-radio label="速達配送（翌日）"       value="express"  />
                  <v-radio label="店頭受け取り"           value="pickup"   />
                </v-radio-group>
                <v-radio-group
                  v-model="radioInline"
                  label="サイズ"
                  inline
                  color="primary"
                  class="mt-2"
                >
                  <v-radio label="S" value="S" />
                  <v-radio label="M" value="M" />
                  <v-radio label="L" value="L" />
                  <v-radio label="XL" value="XL" />
                </v-radio-group>
                <p class="text-caption text-medium-emphasis mt-1">
                  配送: {{ radioValue }}　サイズ: {{ radioInline }}
                </p>
              </section>

              <v-divider class="mb-8" />

              <!-- トグルボタン -->
              <section class="mb-8">
                <p class="text-overline text-medium-emphasis mb-2">トグルボタン</p>

                <p class="text-body-2 mb-1">単一選択</p>
                <v-btn-toggle v-model="toggleSingle" color="primary" variant="outlined" rounded="lg" mandatory>
                  <v-btn value="list"  icon="mdi-view-list"   />
                  <v-btn value="grid"  icon="mdi-view-grid"   />
                  <v-btn value="table" icon="mdi-table-large" />
                </v-btn-toggle>
                <p class="text-caption text-medium-emphasis mt-1 mb-4">
                  表示形式: {{ toggleSingle }}
                </p>

                <p class="text-body-2 mb-1">複数選択</p>
                <v-btn-toggle v-model="toggleMultiple" color="primary" variant="outlined" rounded="lg" multiple>
                  <v-btn value="bold"          icon="mdi-format-bold"          />
                  <v-btn value="italic"        icon="mdi-format-italic"        />
                  <v-btn value="underline"     icon="mdi-format-underline"     />
                  <v-btn value="strikethrough" icon="mdi-format-strikethrough" />
                </v-btn-toggle>
                <p class="text-caption text-medium-emphasis mt-1">
                  書式: {{ toggleMultiple.length ? toggleMultiple.join(', ') : 'なし' }}
                </p>
              </section>

              <v-divider class="mb-8" />

              <!-- プルダウンリスト -->
              <section class="mb-8">
                <p class="text-overline text-medium-emphasis mb-2">プルダウンリスト</p>
                <v-select
                  v-model="selectSingle"
                  :items="prefectures"
                  label="都道府県"
                  variant="outlined"
                  class="mb-4"
                />
                <v-select
                  v-model="selectMultiple"
                  :items="categories"
                  label="カテゴリ（複数選択可）"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                  class="mb-2"
                />
                <p class="text-caption text-medium-emphasis">
                  都道府県: {{ selectSingle ?? '未選択' }}
                  カテゴリ: {{ selectMultiple.length ? selectMultiple.join(', ') : '未選択' }}
                </p>
              </section>

              <v-divider class="mb-8" />

              <!-- カレンダー -->
              <section class="mb-8">
                <p class="text-overline text-medium-emphasis mb-2">カレンダー</p>

                <p class="text-body-2 mb-2">単一日付</p>
                <DatePickerField v-model="selectedDate" label="日付を選択" class="mb-6" />

                <p class="text-body-2 mb-2">期間選択</p>
                <DateRangePickerField v-model:start="rangeStart" v-model:end="rangeEnd" />
                <p class="text-caption text-medium-emphasis mt-2">
                  {{ rangeStart && rangeEnd
                    ? formatDate(rangeStart) + ' 〜 ' + formatDate(rangeEnd)
                    : rangeStart ? formatDate(rangeStart) + ' 〜 未選択' : '未選択' }}
                </p>
              </section>

              <v-divider class="mb-8" />

              <!-- 時刻選択 -->
              <section class="mb-4">
                <p class="text-overline text-medium-emphasis mb-2">時刻</p>

                <v-card variant="outlined" class="mb-6 pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">デフォルトパターン（Vuetify 標準）</p>
                  <p class="text-caption text-medium-emphasis mb-4">
                    Vuetify 組み込みの <code>v-time-picker</code> を使用。クロック形式で時・分を選択します。
                  </p>

                  <p class="text-body-2 mb-2">単一時刻</p>
                  <TimePickerField v-model="defTime" label="時刻を選択" class="mb-4" />

                  <p class="text-body-2 mb-2">時間範囲</p>
                  <TimeRangePickerField v-model:start="defRangeStart" v-model:end="defRangeEnd" />
                  <p class="text-caption text-medium-emphasis mt-2">
                    {{ defRangeStart && defRangeEnd ? defRangeStart + ' 〜 ' + defRangeEnd : '未選択' }}
                  </p>
                </v-card>

                <v-card variant="outlined" class="pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">自作パターン（ホイールピッカー）</p>
                  <p class="text-caption text-medium-emphasis mb-4">
                    CSS scroll-snap で実装したドラムロール型UI。iOS 標準の時刻選択に近い操作感。
                    上下スワイプまたはアイテムタップで値を変更できます。
                  </p>

                  <p class="text-body-2 mb-2">単一時刻</p>
                  <TimeWheelPickerField v-model="wheelTime" label="時刻を選択" class="mb-4" />

                  <p class="text-body-2 mb-2">時間範囲</p>
                  <TimeWheelRangePickerField v-model:start="wheelRangeStart" v-model:end="wheelRangeEnd" />
                  <p class="text-caption text-medium-emphasis mt-2">
                    {{ wheelRangeStart && wheelRangeEnd ? wheelRangeStart + ' 〜 ' + wheelRangeEnd : '未選択' }}
                  </p>
                </v-card>
              </section>

            </v-container>
          </v-window-item>

          <!-- ===== 表示制御 ===== -->
          <v-window-item value="display">
            <v-container class="pb-8">

              <section class="mb-8">
                <p class="text-overline text-medium-emphasis mb-2">表示制御パターン</p>

                <v-card variant="outlined" class="mb-4 pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">v-if — 条件付きレンダリング</p>
                  <p class="text-caption text-medium-emphasis mb-3">
                    条件が false のとき DOM から完全に除去されます。追加入力欄の出し入れなどに最適。
                  </p>
                  <v-checkbox v-model="showExtra" label="追加情報を入力する" color="primary" hide-details class="mb-2" />
                  <v-expand-transition>
                    <div v-if="showExtra">
                      <v-text-field label="会社名" variant="outlined" density="compact" class="mb-2" />
                      <v-text-field label="部署名" variant="outlined" density="compact" />
                    </div>
                  </v-expand-transition>
                </v-card>

                <v-card variant="outlined" class="mb-4 pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">v-show — 表示/非表示切り替え</p>
                  <p class="text-caption text-medium-emphasis mb-3">
                    DOM は残り visibility/display だけ切り替えます。頻繁に開閉する場合は v-if より高速。
                  </p>
                  <v-btn
                    :prepend-icon="showDetail ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    variant="tonal"
                    color="primary"
                    size="small"
                    class="mb-2"
                    @click="showDetail = !showDetail"
                  >{{ showDetail ? '詳細を隠す' : '詳細を表示' }}</v-btn>
                  <div v-show="showDetail" class="pa-3 rounded bg-grey-lighten-4">
                    <p class="text-body-2">v-show で表示制御されたコンテンツです。</p>
                    <p class="text-body-2">DOM に残るため再表示が速いです。</p>
                  </div>
                </v-card>

                <v-card variant="outlined" class="pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">v-menu — ポップアップメニュー</p>
                  <p class="text-caption text-medium-emphasis mb-3">
                    ボタン近くに小さいドロップダウンを出します。コンテキストメニューや操作メニューに使います。
                  </p>
                  <div class="d-flex align-center gap-3">
                    <span class="text-body-2">操作対象アイテム</span>
                    <v-menu>
                      <template #activator="{ props: menuProps }">
                        <v-btn icon="mdi-dots-vertical" variant="text" v-bind="menuProps" />
                      </template>
                      <v-list density="compact">
                        <v-list-item prepend-icon="mdi-pencil"       title="編集"   @click="menuResult = '編集を選択'" />
                        <v-list-item prepend-icon="mdi-content-copy" title="コピー" @click="menuResult = 'コピーを選択'" />
                        <v-divider />
                        <v-list-item prepend-icon="mdi-delete" title="削除" color="error" @click="menuResult = '削除を選択'" />
                      </v-list>
                    </v-menu>
                  </div>
                  <p v-if="menuResult" class="text-caption text-medium-emphasis mt-2">→ {{ menuResult }}</p>
                </v-card>
              </section>

            </v-container>
          </v-window-item>

          <!-- ===== ダイアログ ===== -->
          <v-window-item value="dialog">
            <v-container class="pb-8">

              <section class="mb-8">
                <p class="text-overline text-medium-emphasis mb-2">ダイアログパターン</p>
                <p class="text-caption text-medium-emphasis mb-4">
                  用途に応じて使い分けます。すべてユーザーの注意を集中させる目的で使います。
                </p>
                <div class="d-flex flex-column gap-3">

                  <v-card variant="outlined" class="pa-4">
                    <p class="text-subtitle-2 font-weight-bold mb-1">情報ダイアログ</p>
                    <p class="text-caption text-medium-emphasis mb-3">メッセージの提示・内容の確認。閉じるボタンのみ。</p>
                    <v-btn color="primary" variant="tonal" prepend-icon="mdi-information" @click="infoDialog = true">
                      情報を表示
                    </v-btn>
                  </v-card>

                  <v-card variant="outlined" class="pa-4">
                    <p class="text-subtitle-2 font-weight-bold mb-1">確認ダイアログ（ConfirmDialog）</p>
                    <p class="text-caption text-medium-emphasis mb-3">OK / キャンセルで分岐。削除・送信前の確認に。</p>
                    <v-btn color="error" variant="tonal" prepend-icon="mdi-delete" @click="confirmDialog = true">
                      削除の確認
                    </v-btn>
                    <p v-if="confirmResult" class="text-caption text-medium-emphasis mt-2">→ {{ confirmResult }}</p>
                  </v-card>

                  <v-card variant="outlined" class="pa-4">
                    <p class="text-subtitle-2 font-weight-bold mb-1">フォームダイアログ</p>
                    <p class="text-caption text-medium-emphasis mb-3">入力フォームを内包。新規作成・編集に使います。</p>
                    <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="formDialog = true">
                      新規追加
                    </v-btn>
                    <p v-if="formResult" class="text-caption text-medium-emphasis mt-2">→ 登録: {{ formResult }}</p>
                  </v-card>

                  <v-card variant="outlined" class="pa-4">
                    <p class="text-subtitle-2 font-weight-bold mb-1">フルスクリーンダイアログ</p>
                    <p class="text-caption text-medium-emphasis mb-3">画面全体を占有。複雑な編集フォームや詳細ページに。</p>
                    <v-btn color="primary" variant="tonal" prepend-icon="mdi-fullscreen" @click="fullscreenDialog = true">
                      フルスクリーンで開く
                    </v-btn>
                  </v-card>

                </div>
              </section>

              <!-- 情報ダイアログ -->
              <BaseDialog v-model="infoDialog" title="お知らせ">
                <p class="text-body-2">この操作は取り消せません。</p>
                <p class="text-body-2 mt-2">詳細については利用規約をご確認ください。</p>
                <template #actions>
                  <v-spacer />
                  <v-btn color="primary" variant="elevated" @click="infoDialog = false">閉じる</v-btn>
                </template>
              </BaseDialog>

              <!-- 確認ダイアログ -->
              <ConfirmDialog
                v-model="confirmDialog"
                title="削除の確認"
                message="このアイテムを削除しますか？この操作は取り消せません。"
                @confirm="confirmResult = 'OK を選択'; confirmDialog = false"
                @cancel="confirmResult = 'キャンセルを選択'; confirmDialog = false"
              />

              <!-- フォームダイアログ -->
              <BaseDialog v-model="formDialog" title="新規アイテムを追加" max-width="440px">
                <v-text-field v-model="formName"  label="名前"  variant="outlined" density="compact" class="mb-3" />
                <v-text-field v-model="formEmail" label="メール" variant="outlined" density="compact" type="email" />
                <template #actions>
                  <v-spacer />
                  <v-btn variant="text" @click="formDialog = false; formName = ''; formEmail = ''">キャンセル</v-btn>
                  <v-btn
                    color="primary" variant="elevated"
                    :disabled="!formName || !formEmail"
                    @click="formResult = formName + ' / ' + formEmail; formDialog = false; formName = ''; formEmail = ''"
                  >登録</v-btn>
                </template>
              </BaseDialog>

              <!-- フルスクリーンダイアログ -->
              <v-dialog v-model="fullscreenDialog" fullscreen transition="dialog-bottom-transition">
                <v-card>
                  <v-toolbar color="primary" elevation="0">
                    <template #prepend>
                      <v-btn icon="mdi-close" @click="fullscreenDialog = false" />
                    </template>
                    <v-toolbar-title>フルスクリーン編集</v-toolbar-title>
                    <template #append>
                      <v-btn variant="text" @click="fullscreenDialog = false">保存</v-btn>
                    </template>
                  </v-toolbar>
                  <v-container class="pt-6">
                    <v-text-field label="タイトル" variant="outlined" class="mb-4" />
                    <v-textarea  label="本文"     variant="outlined" rows="6" />
                  </v-container>
                </v-card>
              </v-dialog>

            </v-container>
          </v-window-item>

          <!-- ===== 通知 ===== -->
          <v-window-item value="notification">
            <v-container class="pb-8">

              <section class="mb-4">
                <p class="text-overline text-medium-emphasis mb-2">通知・オーバーレイパターン</p>

                <v-card variant="outlined" class="mb-4 pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">v-snackbar（トースト通知）</p>
                  <p class="text-caption text-medium-emphasis mb-3">
                    操作結果の短い通知。自動で消えます。コンテンツ入力には使いません。
                  </p>
                  <div class="d-flex gap-2 flex-wrap">
                    <v-btn color="success" variant="tonal" size="small" prepend-icon="mdi-check-circle"
                      @click="showSnack('success', '保存しました')">成功</v-btn>
                    <v-btn color="error"   variant="tonal" size="small" prepend-icon="mdi-alert-circle"
                      @click="showSnack('error', 'エラーが発生しました')">エラー</v-btn>
                    <v-btn color="info"    variant="tonal" size="small" prepend-icon="mdi-information"
                      @click="showSnack('info', '処理中です...')">情報</v-btn>
                  </div>
                </v-card>

                <v-card variant="outlined" class="pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">v-bottom-sheet（アクションシート）</p>
                  <p class="text-caption text-medium-emphasis mb-3">
                    画面下から出るオーバーレイ。スマホでの選択メニューやフィルタに最適。
                  </p>
                  <v-btn color="primary" variant="tonal" prepend-icon="mdi-menu-up" @click="bottomSheet = true">
                    アクションシートを開く
                  </v-btn>
                  <p v-if="sheetResult" class="text-caption text-medium-emphasis mt-2">→ {{ sheetResult }}</p>
                </v-card>
              </section>

              <v-bottom-sheet v-model="bottomSheet">
                <v-card rounded="t-xl">
                  <v-card-title class="pt-4">操作を選択</v-card-title>
                  <v-list>
                    <v-list-item prepend-icon="mdi-share-variant" title="共有する"        @click="sheetResult = '共有'; bottomSheet = false" />
                    <v-list-item prepend-icon="mdi-download"      title="ダウンロード"    @click="sheetResult = 'ダウンロード'; bottomSheet = false" />
                    <v-list-item prepend-icon="mdi-heart-outline" title="お気に入りに追加" @click="sheetResult = 'お気に入り追加'; bottomSheet = false" />
                    <v-divider />
                    <v-list-item prepend-icon="mdi-delete" title="削除" color="error" @click="sheetResult = '削除'; bottomSheet = false" />
                  </v-list>
                  <div class="pa-4">
                    <v-btn block variant="text" @click="bottomSheet = false">キャンセル</v-btn>
                  </div>
                </v-card>
              </v-bottom-sheet>

            </v-container>
          </v-window-item>

          <!-- ===== スキャナー ===== -->
          <v-window-item value="scanner">
            <v-container class="pb-8">

              <section class="mb-8">
                <p class="text-overline text-medium-emphasis mb-2">バーコード スキャナー</p>
                <p class="text-caption text-medium-emphasis mb-4">
                  カメラを使ってバーコード・QRコードをリアルタイムで読み取ります。
                  <code>npm run dev</code> のブラウザ環境でもWebカメラで動作確認できます。
                </p>

                <v-card variant="outlined" class="mb-4 pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">フォーム入力補助（BarcodeInputField）</p>
                  <p class="text-caption text-medium-emphasis mb-3">
                    テキストフィールド右端のアイコンをタップするとカメラが起動します。
                    読み取ったコードが自動入力されます。
                  </p>
                  <BarcodeInputField
                    v-model="scannedCode"
                    label="バーコード / QR"
                    variant="outlined"
                    clearable
                  />
                  <p v-if="scannedCode" class="text-caption text-medium-emphasis mt-1">
                    入力値: {{ scannedCode }}
                  </p>
                </v-card>

                <v-card variant="outlined" class="pa-4">
                  <p class="text-subtitle-2 font-weight-bold mb-1">連続スキャン → テーブル追加（BarcodeScannerOverlay）</p>
                  <p class="text-caption text-medium-emphasis mb-3">
                    「連続スキャン」ボタンで複数のコードを続けて読み取り、完了するとテーブルに一括追加します。
                  </p>
                  <div class="d-flex align-center gap-3 mb-3">
                    <v-btn
                      color="primary"
                      variant="tonal"
                      prepend-icon="mdi-barcode-scan"
                      @click="scannerStore.requestScan('continuous', r => scanTableRows.push(...r))"
                    >連続スキャン</v-btn>
                    <v-btn
                      v-if="scanTableRows.length"
                      variant="text"
                      color="error"
                      size="small"
                      @click="scanTableRows = []"
                    >テーブルクリア</v-btn>
                  </div>
                  <v-data-table
                    v-if="scanTableRows.length"
                    :headers="[
                      { title: '読み取り値', key: 'text' },
                      { title: 'フォーマット', key: 'format' },
                      { title: '時刻', key: 'timestamp' },
                    ]"
                    :items="scanTableRows.map(r => ({
                      text: r.text,
                      format: r.format,
                      timestamp: new Date(r.timestamp).toLocaleTimeString(),
                    }))"
                    density="compact"
                    class="elevation-0"
                  />
                  <p v-else class="text-caption text-medium-emphasis">
                    スキャン結果がここに表示されます。
                  </p>
                </v-card>
              </section>

            </v-container>
          </v-window-item>

        </v-window>
      </div>
    </div>
  </SubLayout>
</template>

<style scoped>
.sample-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sample-tabs {
  flex-shrink: 0;
  background: rgb(var(--v-theme-background));
}
.sample-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import BaseDialog from '@/components/dialog/BaseDialog.vue'
import ConfirmDialog from '@/components/dialog/ConfirmDialog.vue'
import BarcodeInputField from '@/components/scanner/BarcodeInputField.vue'
import DatePickerField from '@/components/ui/DatePickerField.vue'
import DateRangePickerField from '@/components/ui/DateRangePickerField.vue'
import TimePickerField from '@/components/ui/TimePickerField.vue'
import TimeRangePickerField from '@/components/ui/TimeRangePickerField.vue'
import TimeWheelPickerField from '@/components/ui/TimeWheelPickerField.vue'
import TimeWheelRangePickerField from '@/components/ui/TimeWheelRangePickerField.vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { useScannerStore } from '@/stores/scannerStore'
import type { ScanResult } from '@/types/scanner'

const activeTab = ref('input')
const { showSnack } = useSnackbar()

// ラジオボタン
const radioValue  = ref('standard')
const radioInline = ref('M')

// トグルボタン
const toggleSingle   = ref('list')
const toggleMultiple = ref<string[]>([])

// プルダウンリスト
const selectSingle   = ref<string | null>(null)
const selectMultiple = ref<string[]>([])

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ', '書籍', 'おもちゃ']

// カレンダー
const selectedDate = ref<Date | null>(null)
const rangeStart   = ref<Date | null>(null)
const rangeEnd     = ref<Date | null>(null)

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// 時刻選択
const defTime       = ref<string | null>(null)
const defRangeStart = ref<string | null>(null)
const defRangeEnd   = ref<string | null>(null)

const wheelTime       = ref<string | null>(null)
const wheelRangeStart = ref<string | null>(null)
const wheelRangeEnd   = ref<string | null>(null)

// 表示制御
const showExtra  = ref(false)
const showDetail = ref(false)
const menuResult = ref('')

// ダイアログ
const infoDialog       = ref(false)
const confirmDialog    = ref(false)
const confirmResult    = ref('')
const formDialog       = ref(false)
const formResult       = ref('')
const formName         = ref('')
const formEmail        = ref('')
const fullscreenDialog = ref(false)

// BottomSheet
const bottomSheet = ref(false)
const sheetResult = ref('')

// バーコードスキャナー
const scannerStore  = useScannerStore()
const scannedCode   = ref('')
const scanTableRows = ref<ScanResult[]>([])
</script>
```

- [ ] **Step 2: 型チェックを実行する**

```bash
npm run type-check
```

エラーがないこと。

- [ ] **Step 3: コミットする**

```bash
git add src/pages/ComponentSamplePage.vue
git commit -m "refactor(sample): replace inline date/time/snackbar logic with reusable components"
```
