<template>
  <MainLayout title="商品検索" :footer-actions="footerActions">
    <template #prepend>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <v-container class="pb-6">
      <!-- キーワード検索 -->
      <v-text-field
        v-model="keyword"
        label="キーワード検索"
        prepend-inner-icon="mdi-magnify"
        clearable
        variant="outlined"
        class="mt-4 mb-2"
      />

      <!-- 絞り込みボタン -->
      <div class="mb-4">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-filter-outline"
          @click="filterDialog = true"
        >
          絞り込み
        </v-btn>
      </div>

      <!-- 適用中フィルタ表示 -->
      <div v-if="selectedCategory || inStockOnly" class="d-flex flex-wrap gap-1 mb-3">
        <v-chip v-if="selectedCategory" size="small" closable @click:close="selectedCategory = ''">
          {{ selectedCategory }}
        </v-chip>
        <v-chip v-if="inStockOnly" size="small" closable @click:close="inStockOnly = false">
          在庫あり
        </v-chip>
      </div>
    </v-container>

    <!-- 絞り込みダイアログ -->
    <v-dialog v-model="filterDialog" max-width="400">
      <v-card>
        <v-card-title class="pt-4 px-4">絞り込み条件</v-card-title>
        <v-card-text>
          <p class="text-subtitle-2 mb-1">カテゴリ</p>
          <v-radio-group v-model="selectedCategory" class="mb-4">
            <v-radio label="すべて" value="" />
            <v-radio v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </v-radio-group>
          <v-divider class="mb-4" />
          <v-switch
            v-model="inStockOnly"
            label="在庫ありのみ表示"
            color="primary"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-btn variant="text" @click="clearFilter">リセット</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="elevated" @click="filterDialog = false">閉じる</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import type { FooterAction } from '@/types/layout'

const router = useRouter()

const keyword = ref('')
const selectedCategory = ref('')
const inStockOnly = ref(false)
const filterDialog = ref(false)

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ'] as const

function search() {
  const query: Record<string, string> = {}
  if (keyword.value) query.q = keyword.value
  if (selectedCategory.value) query.category = selectedCategory.value
  if (inStockOnly.value) query.inStock = 'true'
  router.push({ path: '/products', query })
}

function clearFilter() {
  selectedCategory.value = ''
  inStockOnly.value = false
}

const footerActions: FooterAction[] = [
  { icon: 'mdi-magnify', label: '検索', onClick: search },
  { icon: 'mdi-barcode-scan', label: '読み取り', onClick: () => router.push('/scanner') },
]
</script>
