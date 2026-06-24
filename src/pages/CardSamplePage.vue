<template>
  <SubLayout title="カードサンプル">
    <v-container class="pb-8">

      <!-- パターン1: ベーシック -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン1 — ベーシック</p>
        <BasicCard v-bind="basicItem" @detail="onDetail('BasicCard')" />
      </section>

      <!-- パターン2: ステータスチップ付き -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン2 — ステータスチップ（入力済み / 未入力）</p>
        <StatusChipCard
          v-for="(item, i) in chipItems"
          :key="i"
          class="mb-3"
          v-bind="item"
          @detail="onDetail('StatusChipCard', item.title)"
        />
      </section>

      <!-- パターン3: アイコン付きフィールドリスト -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン3 — アイコン付きフィールドリスト</p>
        <FieldListCard v-bind="fieldListItem" @detail="onDetail('FieldListCard')" />
      </section>

      <!-- パターン4: チェック選択型 -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン4 — チェック選択</p>
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption text-medium-emphasis">{{ selectedIds.length }}件選択中</span>
          <v-btn
            v-if="selectedIds.length"
            size="small"
            variant="text"
            color="error"
            @click="selectedIds = []"
          >選択解除</v-btn>
        </div>
        <SelectableCard
          v-for="item in selectableItems"
          :key="item.id"
          class="mb-3"
          :model-value="selectedIds.includes(item.id)"
          :name="item.name"
          :code="item.code"
          :date="item.date"
          :status="item.status"
          :status-color="item.statusColor"
          @update:model-value="toggleSelect(item.id)"
        />
      </section>

      <!-- パターン5: コンボ -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン5 — コンボ（チップ＋フィールド＋複数アクション）</p>
        <ComboCard
          v-bind="comboItem"
          @detail="onDetail('ComboCard')"
          @action="onComboAction"
        />
      </section>

    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import BasicCard from '@/components/card/BasicCard.vue'
import StatusChipCard from '@/components/card/StatusChipCard.vue'
import FieldListCard from '@/components/card/FieldListCard.vue'
import SelectableCard from '@/components/card/SelectableCard.vue'
import ComboCard from '@/components/card/ComboCard.vue'

// --- パターン1 ---
const basicItem = {
  title: '田中 太郎',
  subtitle: '顧客ID: 10023',
  body: '東京都渋谷区1-2-3 サンプルビル 4F',
}

// --- パターン2 ---
const chipItems = [
  {
    title: '受注 #ORD-2024-0892',
    subtitle: '2024/06/24 10:30',
    body: '合計: ¥12,800',
    chips: [
      { label: '入力済み', color: 'success', icon: 'mdi-check-circle' },
      { label: '処理中',   color: 'warning', icon: 'mdi-clock-outline' },
    ],
  },
  {
    title: '受注 #ORD-2024-0893',
    subtitle: '2024/06/24 11:15',
    body: '合計: ¥5,400',
    chips: [
      { label: '未入力', color: 'default', icon: 'mdi-circle-outline' },
      { label: '要対応', color: 'error',   icon: 'mdi-alert-circle'   },
    ],
  },
]

// --- パターン3 ---
const fieldListItem = {
  title: '在庫 #STK-20240624',
  fields: [
    { icon: 'mdi-package-variant', label: '商品名',       value: 'サンプル商品 A' },
    { icon: 'mdi-counter',         label: '数量',         value: '250 個'         },
    { icon: 'mdi-map-marker',      label: 'ロケーション', value: '倉庫A-3F-棚12'  },
    { icon: 'mdi-calendar',        label: '入荷日',       value: '2024/06/20'     },
    { icon: 'mdi-tag',             label: '単価',         value: '¥1,200', bold: true },
  ],
}

// --- パターン4 ---
const selectedIds = ref<number[]>([])

const selectableItems = [
  { id: 1, name: '出荷指示 #OUT-001', code: 'WH-A', date: '2024/06/24', status: '未処理', statusColor: 'warning' },
  { id: 2, name: '出荷指示 #OUT-002', code: 'WH-B', date: '2024/06/24', status: '完了',   statusColor: 'success' },
  { id: 3, name: '出荷指示 #OUT-003', code: 'WH-A', date: '2024/06/23', status: 'エラー', statusColor: 'error'   },
]

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value = [...selectedIds.value, id]
  else selectedIds.value = selectedIds.value.filter((v) => v !== id)
}

// --- パターン5 ---
const comboItem = {
  title: '配送 #SHP-2024-0234',
  chips: [
    { label: '入力済み', color: 'success', icon: 'mdi-check-circle' },
    { label: '配送中',   color: 'primary' },
  ],
  fields: [
    { icon: 'mdi-account',   label: '届け先',   value: '山田 花子'         },
    { icon: 'mdi-map-marker', label: '住所',    value: '大阪府大阪市1-1-1' },
    { icon: 'mdi-truck',     label: '伝票番号', value: '1234-5678-9012'    },
  ],
  actions: [
    { label: '編集', icon: 'mdi-pencil', color: 'primary' },
  ],
}

// --- イベントハンドラ ---
function onDetail(pattern: string, label?: string) {
  console.log(`[${pattern}] 詳細: ${label ?? ''}`)
}

function onComboAction(index: number) {
  console.log(`[ComboCard] action index: ${index}`)
}
</script>
