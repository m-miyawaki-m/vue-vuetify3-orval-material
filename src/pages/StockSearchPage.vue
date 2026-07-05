<template>
  <MainLayout title="在庫検索">
    <template #prepend>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <v-container class="pb-6">
      <!-- 検索条件フォーム（この画面固有の条件オブジェクトを組み立てる） -->
      <v-text-field
        v-model="keywordInput"
        label="キーワード（スペース区切りで OR 検索）"
        prepend-inner-icon="mdi-magnify"
        clearable
        variant="outlined"
        class="mt-4 mb-2"
      />
      <v-select
        v-model="selectedCategories"
        :items="categoryItems"
        label="カテゴリ（複数選択で OR）"
        multiple
        chips
        closable-chips
        clearable
        variant="outlined"
        class="mb-2"
      />
      <v-switch
        v-model="inStockOnly"
        label="在庫ありのみ"
        color="primary"
        hide-details
        class="mb-4"
      />
      <v-btn
        block
        color="primary"
        prepend-icon="mdi-magnify"
        :loading="isLoading"
        @click="onSearch"
      >
        検索
      </v-btn>

      <v-divider class="my-4" />

      <!-- 検索結果（検索ボタン押下前は何も出さない） -->
      <template v-if="condition">
        <v-progress-linear
          v-if="isLoading"
          data-testid="search-loading"
          indeterminate
          color="primary"
          class="mb-3"
        />
        <template v-else-if="searchResult">
          <p class="text-body-2 text-medium-emphasis mb-2">{{ searchResult.total }}件</p>
          <v-alert
            v-if="searchResult.items.length === 0"
            type="info"
            variant="tonal"
          >
            条件に一致する商品が見つかりませんでした。
          </v-alert>
          <ProductCard
            v-for="product in searchResult.items"
            :key="product.id"
            :product="product"
            @detail="goDetail(product)"
            @click="goDetail(product)"
          />
        </template>
        <v-alert v-else-if="error" type="error" variant="tonal">
          検索に失敗しました。通信環境を確認してもう一度お試しください。
        </v-alert>
      </template>
    </v-container>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import { useStockSearch } from '@/composables/queries/useStockSearch'
import { ProductCategory } from '@/types/api'
import type { Product, StockSearchCondition } from '@/types/api'

const router = useRouter()

const keywordInput = ref('')
const selectedCategories = ref<Product['category'][]>([])
const inStockOnly = ref(false)

const categoryItems = Object.values(ProductCategory)

// 検索ボタン押下時にだけ条件オブジェクトを確定させる（null の間は通信しない）
const condition = ref<StockSearchCondition | null>(null)
const { searchResult, isLoading, error } = useStockSearch(condition)

function onSearch() {
  condition.value = {
    keywords: keywordInput.value?.split(/\s+/).filter(Boolean) ?? [],
    categories: selectedCategories.value,
    inStockOnly: inStockOnly.value,
  }
}

function goDetail(product: Product) {
  router.push(`/detail/${product.id}`)
}
</script>
