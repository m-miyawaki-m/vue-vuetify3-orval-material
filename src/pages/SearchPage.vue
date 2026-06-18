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

      <!-- 適用中フィルタ -->
      <SearchConditionChips
        v-if="selectedCategory || inStockOnly"
        :category="selectedCategory"
        :in-stock="inStockOnly"
        closable
        class="mb-3"
        @remove="onRemoveFilter"
      />
    </v-container>

    <ProductFilterDialog
      v-model="filterDialog"
      :category="selectedCategory"
      :in-stock="inStockOnly"
      @update:category="selectedCategory = $event"
      @update:in-stock="inStockOnly = $event"
      @reset="clearFilter"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductFilterDialog, { type Category } from '@/components/search/ProductFilterDialog.vue'
import SearchConditionChips from '@/components/search/SearchConditionChips.vue'
import type { FooterAction } from '@/types/layout'
import { buildSearchQuery } from '@/utils/searchUtils'

const router = useRouter()

const keyword = ref('')
const selectedCategory = ref<Category>('')
const inStockOnly = ref(false)
const filterDialog = ref(false)

function search() {
  const query = buildSearchQuery(keyword.value, selectedCategory.value, inStockOnly.value)
  router.push({ path: '/products', query })
}

function clearFilter() {
  selectedCategory.value = ''
  inStockOnly.value = false
}

function onRemoveFilter(key: 'q' | 'category' | 'inStock') {
  if (key === 'category') selectedCategory.value = ''
  if (key === 'inStock') inStockOnly.value = false
}

const footerActions: FooterAction[] = [
  { icon: 'mdi-magnify', label: '検索', onClick: search },
  { icon: 'mdi-barcode-scan', label: '読み取り', onClick: () => router.push('/scanner') },
]
</script>
