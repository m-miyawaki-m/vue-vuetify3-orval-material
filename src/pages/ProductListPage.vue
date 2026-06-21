<template>
  <MainLayout title="検索結果">
    <template #prepend>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <!-- 上部固定エリア -->
    <div class="list-header">
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
        <span class="text-body-2 text-medium-emphasis">{{ displayData.total }}件</span>
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
      <v-container fluid class="pb-6">
        <template v-if="!isLoading">
          <template v-if="displayData.items.length > 0">
            <ProductCard
              v-for="product in displayData.items"
              :key="product.id"
              :product="product"
              @click="openDialog(product)"
              @detail="goDetail(product)"
            />
          </template>
          <v-alert v-else type="info" variant="tonal">
            条件に一致する商品が見つかりませんでした。
          </v-alert>
        </template>
      </v-container>
    </div>

    <!-- フッター: ページネーション -->
    <template #footer>
      <div class="pagination-wrap">
        <v-pagination
          :model-value="currentPage"
          :length="displayData.totalPages"
          :total-visible="3"
          density="compact"
          @update:model-value="onPageChange"
        />
      </div>
    </template>

    <!-- クイックビューダイアログ -->
    <ProductDialog v-model="dialogOpen" :product="selectedProduct" @detail="goDetail" />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getProductsAPI } from '@/api/products'
import type { Product, ProductListResponse } from '@/api/products'
import { mockProducts } from '@/mocks/products'
import { useAsync } from '@/composables/useAsync'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDialog from '@/components/product/ProductDialog.vue'
import SearchConditionChips from '@/components/search/SearchConditionChips.vue'
import { filterProducts } from '@/utils/searchUtils'

const { getProducts } = getProductsAPI()

const PAGE_SIZE = 5
const router = useRouter()
const route = useRoute()

const currentPage = ref(1)
const selectedProduct = ref<Product | null>(null)
const dialogOpen = ref(false)

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

function openDialog(product: Product) {
  selectedProduct.value = product
  dialogOpen.value = true
}

function goDetail(product: Product) {
  dialogOpen.value = false
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

.pagination-wrap {
  width: 100%;
}

/* 全ボタン（数字・…・prev・next）を同じ幅に固定 */
.pagination-wrap :deep(.v-pagination__list) {
  display: flex;
  justify-content: center;
}

.pagination-wrap :deep(.v-btn.v-pagination__item),
.pagination-wrap :deep(.v-btn.v-pagination__prev),
.pagination-wrap :deep(.v-btn.v-pagination__next) {
  width: 36px !important;
  min-width: 36px !important;
  flex: 0 0 36px;
}
</style>
