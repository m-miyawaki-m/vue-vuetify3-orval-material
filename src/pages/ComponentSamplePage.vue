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

        <!-- 単一日付 -->
        <p class="text-body-2 mb-2">単一日付</p>
        <v-text-field
          :model-value="selectedDate ? formatDate(selectedDate) : ''"
          label="日付を選択"
          variant="outlined"
          readonly
          placeholder="yyyy/mm/dd"
          class="mb-6"
        >
          <template #append-inner>
            <v-btn icon="mdi-calendar" variant="text" density="compact" @click="openSingle" />
          </template>
        </v-text-field>

        <!-- 期間選択 -->
        <p class="text-body-2 mb-2">期間選択</p>
        <div class="d-flex align-center gap-2 mb-1">
          <v-text-field
            :model-value="rangeStart ? formatDate(rangeStart) : ''"
            label="開始日"
            variant="outlined"
            readonly
            placeholder="yyyy/mm/dd"
            hide-details
            style="flex:1"
          />
          <span class="text-body-2 mx-1">〜</span>
          <v-text-field
            :model-value="rangeEnd ? formatDate(rangeEnd) : ''"
            label="終了日"
            variant="outlined"
            readonly
            placeholder="yyyy/mm/dd"
            hide-details
            style="flex:1"
          />
          <v-btn icon="mdi-calendar-range" variant="tonal" color="primary" class="ml-1" @click="openRange" />
        </div>
        <p class="text-caption text-medium-emphasis mt-2">
          {{ rangeStart && rangeEnd
            ? formatDate(rangeStart) + ' 〜 ' + formatDate(rangeEnd)
            : rangeStart ? formatDate(rangeStart) + ' 〜 未選択' : '未選択' }}
        </p>
      </section>

      <!-- カレンダーダイアログ（単一） -->
      <v-dialog v-model="singleDialog" max-width="360">
        <v-card>
          <v-card-title class="pt-4 pl-4">日付を選択</v-card-title>
          <v-date-picker
            v-model="tempDate"
            color="primary"
            show-adjacent-months
            elevation="0"
          />
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="singleDialog = false">キャンセル</v-btn>
            <v-btn color="primary" variant="elevated" @click="confirmSingle">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- カレンダーダイアログ（期間） -->
      <v-dialog v-model="rangeDialog" max-width="360">
        <v-card>
          <v-card-title class="pt-4 pl-4">期間を選択</v-card-title>
          <v-card-subtitle class="pb-0 pl-4">
            {{ tempRange.length === 0 ? '開始日をタップ' : tempRange.length === 1 ? '終了日をタップ' : '期間が選択されました' }}
          </v-card-subtitle>
          <v-date-picker
            v-model="tempRange"
            color="primary"
            show-adjacent-months
            multiple="range"
            elevation="0"
          />
          <v-card-actions>
            <v-btn variant="text" @click="clearRange">クリア</v-btn>
            <v-spacer />
            <v-btn variant="text" @click="rangeDialog = false">キャンセル</v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :disabled="tempRange.length < 2"
              @click="confirmRange"
            >OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-divider class="mb-8" />

      <!-- ⑥ 時刻選択 -->
      <section class="mb-4">
        <p class="text-overline text-medium-emphasis mb-2">時刻</p>

        <!-- ── デフォルトパターン ── -->
        <v-card variant="outlined" class="mb-6 pa-4">
          <p class="text-subtitle-2 font-weight-bold mb-1">デフォルトパターン（Vuetify 標準）</p>
          <p class="text-caption text-medium-emphasis mb-4">
            Vuetify 組み込みの <code>v-time-picker</code> を使用。クロック形式で時・分を選択します。
          </p>

          <p class="text-body-2 mb-2">単一時刻</p>
          <v-text-field
            :model-value="defTime ?? ''"
            label="時刻を選択"
            variant="outlined"
            readonly
            placeholder="HH:mm"
            class="mb-4"
          >
            <template #append-inner>
              <v-btn icon="mdi-clock-outline" variant="text" density="compact" @click="openDefSingle" />
            </template>
          </v-text-field>

          <p class="text-body-2 mb-2">時間範囲</p>
          <div class="d-flex align-center gap-2">
            <v-text-field
              :model-value="defRangeStart ?? ''"
              label="開始時刻"
              variant="outlined"
              readonly
              placeholder="HH:mm"
              hide-details
              style="flex:1"
            />
            <span class="text-body-2 mx-1">〜</span>
            <v-text-field
              :model-value="defRangeEnd ?? ''"
              label="終了時刻"
              variant="outlined"
              readonly
              placeholder="HH:mm"
              hide-details
              style="flex:1"
            />
            <v-btn icon="mdi-clock-start" variant="tonal" color="primary" class="ml-1" @click="openDefRange" />
          </div>
          <p class="text-caption text-medium-emphasis mt-2">
            {{ defRangeStart && defRangeEnd ? defRangeStart + ' 〜 ' + defRangeEnd : '未選択' }}
          </p>
        </v-card>

        <!-- ── 自作パターン ── -->
        <v-card variant="outlined" class="pa-4">
          <p class="text-subtitle-2 font-weight-bold mb-1">自作パターン（ホイールピッカー）</p>
          <p class="text-caption text-medium-emphasis mb-4">
            CSS scroll-snap で実装したドラムロール型UI。iOS 標準の時刻選択に近い操作感。
            上下スワイプまたはアイテムタップで値を変更できます。
          </p>

          <p class="text-body-2 mb-2">単一時刻</p>
          <v-text-field
            :model-value="wheelTime ?? ''"
            label="時刻を選択"
            variant="outlined"
            readonly
            placeholder="HH:mm"
            class="mb-4"
          >
            <template #append-inner>
              <v-btn icon="mdi-clock-outline" variant="text" density="compact" @click="openWheelSingle" />
            </template>
          </v-text-field>

          <p class="text-body-2 mb-2">時間範囲</p>
          <div class="d-flex align-center gap-2">
            <v-text-field
              :model-value="wheelRangeStart ?? ''"
              label="開始時刻"
              variant="outlined"
              readonly
              placeholder="HH:mm"
              hide-details
              style="flex:1"
            />
            <span class="text-body-2 mx-1">〜</span>
            <v-text-field
              :model-value="wheelRangeEnd ?? ''"
              label="終了時刻"
              variant="outlined"
              readonly
              placeholder="HH:mm"
              hide-details
              style="flex:1"
            />
            <v-btn icon="mdi-clock-start" variant="tonal" color="primary" class="ml-1" @click="openWheelRange" />
          </div>
          <p class="text-caption text-medium-emphasis mt-2">
            {{ wheelRangeStart && wheelRangeEnd ? wheelRangeStart + ' 〜 ' + wheelRangeEnd : '未選択' }}
          </p>
        </v-card>
      </section>

      <!-- ── デフォルト: 単一ダイアログ ── -->
      <v-dialog v-model="defSingleDialog" max-width="360">
        <v-card>
          <v-card-title class="pt-4 px-4">時刻を選択</v-card-title>
          <div class="d-flex justify-center py-2">
            <v-time-picker v-model="tempDefTime" format="24hr" color="primary" elevation="0" />
          </div>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="defSingleDialog = false">キャンセル</v-btn>
            <v-btn color="primary" variant="elevated" @click="confirmDefSingle">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ── デフォルト: 範囲ダイアログ ── -->
      <v-dialog v-model="defRangeDialog" max-width="360">
        <v-card>
          <v-card-title class="pt-4 px-4">
            {{ defRangeStep === 'start' ? '開始時刻を選択' : '終了時刻を選択' }}
          </v-card-title>
          <div class="d-flex justify-center py-2">
            <v-time-picker
              v-if="defRangeStep === 'start'"
              v-model="tempDefRangeStart"
              format="24hr" color="primary" elevation="0"
            />
            <v-time-picker
              v-else
              v-model="tempDefRangeEnd"
              format="24hr" color="primary" elevation="0"
              :min="tempDefRangeStart ?? undefined"
            />
          </div>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="defRangeDialog = false">キャンセル</v-btn>
            <v-btn
              v-if="defRangeStep === 'start'"
              color="primary" variant="elevated"
              :disabled="!tempDefRangeStart"
              @click="defRangeStep = 'end'"
            >次へ</v-btn>
            <v-btn
              v-else
              color="primary" variant="elevated"
              :disabled="!tempDefRangeEnd"
              @click="confirmDefRange"
            >OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ── ホイール: 単一ダイアログ ── -->
      <v-dialog v-model="wheelSingleDialog" max-width="320">
        <v-card>
          <v-card-title class="pt-4 px-4">時刻を選択</v-card-title>
          <v-card-text class="pb-0">
            <TimeWheelPicker v-model="tempWheelTime" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="wheelSingleDialog = false">キャンセル</v-btn>
            <v-btn color="primary" variant="elevated" @click="confirmWheelSingle">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- ── ホイール: 範囲ダイアログ ── -->
      <v-dialog v-model="wheelRangeDialog" max-width="320">
        <v-card>
          <v-card-title class="pt-4 px-4">
            {{ wheelRangeStep === 'start' ? '開始時刻を選択' : '終了時刻を選択' }}
          </v-card-title>
          <v-card-text class="pb-0">
            <TimeWheelPicker
              v-if="wheelRangeStep === 'start'"
              v-model="tempWheelRangeStart"
            />
            <TimeWheelPicker
              v-else
              v-model="tempWheelRangeEnd"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="wheelRangeDialog = false">キャンセル</v-btn>
            <v-btn
              v-if="wheelRangeStep === 'start'"
              color="primary" variant="elevated"
              :disabled="!tempWheelRangeStart"
              @click="wheelRangeStep = 'end'"
            >次へ</v-btn>
            <v-btn
              v-else
              color="primary" variant="elevated"
              :disabled="!tempWheelRangeEnd"
              @click="confirmWheelRange"
            >OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import TimeWheelPicker from '@/components/ui/TimeWheelPicker.vue'

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
const selectedDate = ref<Date | null>(null)
const rangeStart   = ref<Date | null>(null)
const rangeEnd     = ref<Date | null>(null)

// ダイアログ制御
const singleDialog = ref(false)
const rangeDialog  = ref(false)

// ダイアログ内の一時選択値
const tempDate  = ref<Date | null>(null)
const tempRange = ref<Date[]>([])

function openSingle() {
  tempDate.value = selectedDate.value
  singleDialog.value = true
}

function confirmSingle() {
  selectedDate.value = tempDate.value
  singleDialog.value = false
}

function openRange() {
  tempRange.value = [rangeStart.value, rangeEnd.value].filter(Boolean) as Date[]
  rangeDialog.value = true
}

function confirmRange() {
  rangeStart.value = tempRange.value[0] ?? null
  rangeEnd.value   = tempRange.value[tempRange.value.length - 1] ?? null
  rangeDialog.value = false
}

function clearRange() {
  tempRange.value = []
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// ⑥ 時刻選択 ── デフォルトパターン（v-time-picker）
const defTime       = ref<string | null>(null)
const defRangeStart = ref<string | null>(null)
const defRangeEnd   = ref<string | null>(null)

const defSingleDialog = ref(false)
const defRangeDialog  = ref(false)
const defRangeStep    = ref<'start' | 'end'>('start')

const tempDefTime       = ref<string | null>(null)
const tempDefRangeStart = ref<string | null>(null)
const tempDefRangeEnd   = ref<string | null>(null)

function openDefSingle() {
  tempDefTime.value = defTime.value
  defSingleDialog.value = true
}
function confirmDefSingle() {
  defTime.value = tempDefTime.value
  defSingleDialog.value = false
}
function openDefRange() {
  tempDefRangeStart.value = defRangeStart.value
  tempDefRangeEnd.value   = defRangeEnd.value
  defRangeStep.value = 'start'
  defRangeDialog.value = true
}
function confirmDefRange() {
  defRangeStart.value = tempDefRangeStart.value
  defRangeEnd.value   = tempDefRangeEnd.value
  defRangeDialog.value = false
}

// ⑥ 時刻選択 ── 自作パターン（ホイールピッカー）
const wheelTime       = ref<string | null>(null)
const wheelRangeStart = ref<string | null>(null)
const wheelRangeEnd   = ref<string | null>(null)

const wheelSingleDialog = ref(false)
const wheelRangeDialog  = ref(false)
const wheelRangeStep    = ref<'start' | 'end'>('start')

const tempWheelTime       = ref<string | null>(null)
const tempWheelRangeStart = ref<string | null>(null)
const tempWheelRangeEnd   = ref<string | null>(null)

function openWheelSingle() {
  tempWheelTime.value = wheelTime.value
  wheelSingleDialog.value = true
}
function confirmWheelSingle() {
  wheelTime.value = tempWheelTime.value
  wheelSingleDialog.value = false
}
function openWheelRange() {
  tempWheelRangeStart.value = wheelRangeStart.value
  tempWheelRangeEnd.value   = wheelRangeEnd.value
  wheelRangeStep.value = 'start'
  wheelRangeDialog.value = true
}
function confirmWheelRange() {
  wheelRangeStart.value = tempWheelRangeStart.value
  wheelRangeEnd.value   = tempWheelRangeEnd.value
  wheelRangeDialog.value = false
}
</script>
