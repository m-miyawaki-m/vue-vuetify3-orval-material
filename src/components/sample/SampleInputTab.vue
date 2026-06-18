<template>
  <v-container class="pb-8">

    <!-- ラジオボタン -->
    <section class="mb-8">
      <p class="text-overline text-medium-emphasis mb-2">ラジオボタン</p>
      <v-radio-group v-model="radioValue" label="配送方法を選択" color="primary">
        <v-radio label="通常配送（3〜5日）" value="standard" />
        <v-radio label="速達配送（翌日）" value="express" />
        <v-radio label="店頭受け取り" value="pickup" />
      </v-radio-group>
      <v-radio-group v-model="radioInline" label="サイズ" inline color="primary" class="mt-2">
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
        <v-btn value="list" icon="mdi-view-list" />
        <v-btn value="grid" icon="mdi-view-grid" />
        <v-btn value="table" icon="mdi-table-large" />
      </v-btn-toggle>
      <p class="text-caption text-medium-emphasis mt-1 mb-4">表示形式: {{ toggleSingle }}</p>

      <p class="text-body-2 mb-1">複数選択</p>
      <v-btn-toggle v-model="toggleMultiple" color="primary" variant="outlined" rounded="lg" multiple>
        <v-btn value="bold" icon="mdi-format-bold" />
        <v-btn value="italic" icon="mdi-format-italic" />
        <v-btn value="underline" icon="mdi-format-underline" />
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
      <v-select v-model="selectSingle" :items="prefectures" label="都道府県" variant="outlined" class="mb-4" />
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
        {{
          rangeStart && rangeEnd
            ? formatDate(rangeStart) + ' 〜 ' + formatDate(rangeEnd)
            : rangeStart
              ? formatDate(rangeStart) + ' 〜 未選択'
              : '未選択'
        }}
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DatePickerField from '@/components/ui/DatePickerField.vue'
import DateRangePickerField from '@/components/ui/DateRangePickerField.vue'
import TimePickerField from '@/components/ui/TimePickerField.vue'
import TimeRangePickerField from '@/components/ui/TimeRangePickerField.vue'
import TimeWheelPickerField from '@/components/ui/TimeWheelPickerField.vue'
import TimeWheelRangePickerField from '@/components/ui/TimeWheelRangePickerField.vue'

const radioValue = ref('standard')
const radioInline = ref('M')

const toggleSingle = ref('list')
const toggleMultiple = ref<string[]>([])

const selectSingle = ref<string | null>(null)
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

const selectedDate = ref<Date | null>(null)
const rangeStart = ref<Date | null>(null)
const rangeEnd = ref<Date | null>(null)

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

const defTime = ref<string | null>(null)
const defRangeStart = ref<string | null>(null)
const defRangeEnd = ref<string | null>(null)

const wheelTime = ref<string | null>(null)
const wheelRangeStart = ref<string | null>(null)
const wheelRangeEnd = ref<string | null>(null)
</script>
