<template>
  <SubLayout title="コンポーネントサンプル">
    <v-container class="pb-8">

      <!-- ① アコーディオン -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">アコーディオン</p>
        <v-expansion-panels v-model="accordion">
          <v-expansion-panel value="panel1">
            <v-expansion-panel-title>セクション 1</v-expansion-panel-title>
            <v-expansion-panel-text>
              アコーディオンの内容です。クリックで開閉します。
            </v-expansion-panel-text>
          </v-expansion-panel>
          <v-expansion-panel value="panel2">
            <v-expansion-panel-title>セクション 2</v-expansion-panel-title>
            <v-expansion-panel-text>
              複数のパネルを同時に開くことも可能です（multiple プロパティで制御）。
            </v-expansion-panel-text>
          </v-expansion-panel>
          <v-expansion-panel value="panel3">
            <v-expansion-panel-title>セクション 3</v-expansion-panel-title>
            <v-expansion-panel-text>
              詳細検索フィルタなどに活用できます。
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
        <p class="text-caption text-medium-emphasis mt-1">
          選択中: {{ accordion ?? 'なし' }}
        </p>
      </section>

      <v-divider class="mb-8" />

      <!-- ② ラジオボタン -->
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

      <!-- ③ トグルボタン -->
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

      <!-- ④ プルダウンリスト -->
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

      <!-- ⑤ カレンダー（日付選択） -->
      <section class="mb-4">
        <p class="text-overline text-medium-emphasis mb-2">カレンダー</p>

        <p class="text-body-2 mb-2">単一日付</p>
        <v-date-picker
          v-model="selectedDate"
          color="primary"
          show-adjacent-months
          class="mb-2"
        />
        <p class="text-caption text-medium-emphasis mb-6">
          選択日: {{ selectedDate ? formatDate(selectedDate) : '未選択' }}
        </p>

        <p class="text-body-2 mb-2">複数日付</p>
        <v-date-picker
          v-model="selectedDates"
          color="primary"
          show-adjacent-months
          multiple
        />
        <p class="text-caption text-medium-emphasis mt-1">
          選択日数: {{ selectedDates.length }}日
          {{ selectedDates.length ? '(' + selectedDates.map(formatDate).join(', ') + ')' : '' }}
        </p>
      </section>

    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'

// ① アコーディオン
const accordion = ref<string | null>(null)

// ② ラジオボタン
const radioValue  = ref('standard')
const radioInline = ref('M')

// ③ トグルボタン
const toggleSingle   = ref('list')
const toggleMultiple = ref<string[]>([])

// ④ プルダウンリスト
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

// ⑤ カレンダー
const selectedDate  = ref<Date | null>(null)
const selectedDates = ref<Date[]>([])

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
</script>
