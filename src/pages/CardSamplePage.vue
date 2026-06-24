<template>
  <SubLayout title="カードサンプル">
    <v-container class="pb-8">

      <!-- パターン1: ベーシック -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン1 — ベーシック</p>
        <v-card class="mb-3">
          <v-card-title class="text-body-1 font-weight-bold">田中 太郎</v-card-title>
          <v-card-subtitle>顧客ID: 10023</v-card-subtitle>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis">東京都渋谷区1-2-3 サンプルビル 4F</p>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="primary">
              詳細を見る
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </section>

      <!-- パターン2: ステータスチップ付き -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン2 — ステータスチップ（入力済み / 未入力）</p>

        <v-card class="mb-3">
          <div class="px-4 pt-3 pb-0 d-flex ga-2">
            <v-chip color="success" size="x-small" variant="tonal" prepend-icon="mdi-check-circle">入力済み</v-chip>
            <v-chip color="warning" size="x-small" variant="tonal" prepend-icon="mdi-clock-outline">処理中</v-chip>
          </div>
          <v-card-title class="text-body-1 font-weight-bold">受注 #ORD-2024-0892</v-card-title>
          <v-card-subtitle>2024/06/24 10:30</v-card-subtitle>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis">合計: ¥12,800</p>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="primary">
              詳細を見る
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card class="mb-3">
          <div class="px-4 pt-3 pb-0 d-flex ga-2">
            <v-chip color="default" size="x-small" variant="tonal" prepend-icon="mdi-circle-outline">未入力</v-chip>
            <v-chip color="error" size="x-small" variant="tonal" prepend-icon="mdi-alert-circle">要対応</v-chip>
          </div>
          <v-card-title class="text-body-1 font-weight-bold">受注 #ORD-2024-0893</v-card-title>
          <v-card-subtitle>2024/06/24 11:15</v-card-subtitle>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis">合計: ¥5,400</p>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="primary">
              詳細を見る
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </section>

      <!-- パターン3: アイコン付きフィールドリスト -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン3 — アイコン付きフィールドリスト</p>
        <v-card class="mb-3">
          <v-card-title class="text-body-1 font-weight-bold">在庫 #STK-20240624</v-card-title>
          <v-card-text class="pt-2">
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-package-variant</v-icon>
              <span class="text-caption text-medium-emphasis label">商品名</span>
              <span class="text-body-2">サンプル商品 A</span>
            </div>
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-counter</v-icon>
              <span class="text-caption text-medium-emphasis label">数量</span>
              <span class="text-body-2">250 個</span>
            </div>
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-map-marker</v-icon>
              <span class="text-caption text-medium-emphasis label">ロケーション</span>
              <span class="text-body-2">倉庫A-3F-棚12</span>
            </div>
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-calendar</v-icon>
              <span class="text-caption text-medium-emphasis label">入荷日</span>
              <span class="text-body-2">2024/06/20</span>
            </div>
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-tag</v-icon>
              <span class="text-caption text-medium-emphasis label">単価</span>
              <span class="text-body-2 font-weight-bold">¥1,200</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="primary">
              詳細を見る
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
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
        <v-card
          v-for="item in checkableItems"
          :key="item.id"
          class="mb-3"
          :color="selectedIds.includes(item.id) ? 'primary' : undefined"
          :variant="selectedIds.includes(item.id) ? 'tonal' : 'elevated'"
          @click="toggleSelect(item.id)"
        >
          <div class="d-flex align-center px-4 py-3 ga-3">
            <v-checkbox-btn
              :model-value="selectedIds.includes(item.id)"
              color="primary"
              @click.stop
              @update:model-value="toggleSelect(item.id)"
            />
            <div class="flex-1-1">
              <p class="text-body-2 font-weight-bold mb-1">{{ item.name }}</p>
              <p class="text-caption text-medium-emphasis">{{ item.code }} · {{ item.date }}</p>
            </div>
            <v-chip :color="item.statusColor" size="x-small" variant="tonal">{{ item.status }}</v-chip>
          </div>
        </v-card>
      </section>

      <!-- パターン5: コンボ（チップ＋フィールド＋複数アクション） -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">パターン5 — コンボ（チップ＋フィールド＋複数アクション）</p>
        <v-card class="mb-3">
          <div class="px-4 pt-3 pb-0 d-flex ga-2">
            <v-chip color="success" size="x-small" variant="tonal" prepend-icon="mdi-check-circle">入力済み</v-chip>
            <v-chip color="primary" size="x-small" variant="tonal">配送中</v-chip>
          </div>
          <v-card-title class="text-body-1 font-weight-bold">配送 #SHP-2024-0234</v-card-title>
          <v-card-text class="pt-2">
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-account</v-icon>
              <span class="text-caption text-medium-emphasis label">届け先</span>
              <span class="text-body-2">山田 花子</span>
            </div>
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-map-marker</v-icon>
              <span class="text-caption text-medium-emphasis label">住所</span>
              <span class="text-body-2">大阪府大阪市1-1-1</span>
            </div>
            <div class="field-row">
              <v-icon size="16" color="medium-emphasis">mdi-truck</v-icon>
              <span class="text-caption text-medium-emphasis label">伝票番号</span>
              <span class="text-body-2">1234-5678-9012</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="primary">
              詳細を見る
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
            <v-spacer />
            <v-btn variant="tonal" color="primary" size="small" prepend-icon="mdi-pencil">編集</v-btn>
          </v-card-actions>
        </v-card>
      </section>

    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'

const selectedIds = ref<number[]>([])

const checkableItems = [
  { id: 1, name: '出荷指示 #OUT-001', code: 'WH-A', date: '2024/06/24', status: '未処理', statusColor: 'warning' },
  { id: 2, name: '出荷指示 #OUT-002', code: 'WH-B', date: '2024/06/24', status: '完了', statusColor: 'success' },
  { id: 3, name: '出荷指示 #OUT-003', code: 'WH-A', date: '2024/06/23', status: 'エラー', statusColor: 'error' },
]

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value = [...selectedIds.value, id]
  else selectedIds.value = selectedIds.value.filter((v) => v !== id)
}
</script>

<style scoped>
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.field-row .label {
  width: 80px;
  flex-shrink: 0;
}
</style>
