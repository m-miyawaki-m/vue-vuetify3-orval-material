<template>
  <MainLayout title="検索結果">
    <template #prepend>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <!-- 上部固定エリア -->
    <div class="list-header">
      <FlowStepper :step="2" />
      <!-- 検索条件 -->
      <div class="px-4 pt-3 pb-2">
        <SearchConditionChips
          :q="queryQ"
          :category="queryCategory"
          :in-stock="queryInStock"
        />
      </div>

      <v-divider />

      <!-- 件数 -->
      <div class="px-4 py-2">
        <span v-if="!isLoading" class="text-body-2 text-medium-emphasis">{{ displayData.total }}件</span>
        <v-skeleton-loader v-else type="text" width="60" />
      </div>

      <v-divider />

      <!-- オフライン通知 -->
      <div v-if="isFallback" class="px-4 py-1">
        <v-chip color="warning" variant="tonal" size="small" prepend-icon="mdi-wifi-off">
          オフラインモード（モックデータ）
        </v-chip>
      </div>

      <!-- ローディング -->
      <v-progress-linear v-if="isLoading" indeterminate color="primary" />
    </div>

    <!-- スクロールエリア -->
    <div class="list-body">
      <v-container fluid class="pb-2">
        <template v-if="!isLoading">
          <template v-if="displayData.items.length > 0">
            <ProductCard
              v-for="product in displayData.items"
              :key="product.id"
              :product="product"
              @detail="goDetail(product)"
            />
          </template>
          <v-alert v-else type="info" variant="tonal">
            条件に一致する商品が見つかりませんでした。
          </v-alert>
        </template>
      </v-container>
    </div>

    <!-- ページネーション（フッター上部固定） -->
    <div class="pagination-bar">
      <v-pagination
        :model-value="currentPage"
        :length="displayData.totalPages"
        :total-visible="3"
        density="compact"
        @update:model-value="onPageChange"
      />
    </div>

  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getAppAPI } from '@/api/index'
import type { Product, ProductListResponse } from '@/api/index'
import mockProductsData from '@/mocks/products-data.json'
import { useAsync } from '@/composables/useAsync'
import FlowStepper from '@/components/ui/FlowStepper.vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import SearchConditionChips from '@/components/search/SearchConditionChips.vue'
import { filterProducts } from '@/utils/searchUtils'

const mockProducts = mockProductsData as Product[]

const { getProducts } = getAppAPI()

const PAGE_SIZE = 5
const router = useRouter()
const route = useRoute()

const currentPage = ref(1)

const queryQ = computed(() => route.query.q as string | undefined)
const queryCategory = computed(() => route.query.category as Product['category'] | undefined)
const queryInStock = computed(() => route.query.inStock === 'true')

const params = computed(() => ({
  q: queryQ.value,
  category: queryCategory.value,
  inStock: queryInStock.value || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

const { data, isLoading, isError } = useAsync(
  () => getProducts(params.value),
  params,
)

const mockFallback = computed<ProductListResponse>(() =>
  filterProducts(
    mockProducts as Product[],
    {
      q: queryQ.value,
      category: queryCategory.value,
      inStock: queryInStock.value,
    },
    currentPage.value,
    PAGE_SIZE,
  ),
)

const isFallback = computed(() => isError.value)
const displayData = computed<ProductListResponse>(() =>
  isFallback.value ? mockFallback.value : (data.value ?? mockFallback.value),
)

function onPageChange(page: number) {
  currentPage.value = page
}

function goDetail(product: Product) {
  router.push(`/detail/${product.id}`)
}
</script>

<style scoped>
.list-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgb(var(--v-theme-background));
}

.list-body {
  overflow-y: auto;
  flex: 1;
}

.pagination-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  background-color: rgb(var(--v-theme-background));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  justify-content: center;
  padding: 4px 0;
}
</style>
