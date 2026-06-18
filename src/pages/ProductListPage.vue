<template>
  <MainLayout title="検索結果" :footer-actions="footerActions">
    <template #prepend>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <v-container class="pb-6">
      <!-- 検索条件 -->
      <div class="d-flex flex-wrap align-center gap-1 mt-4 mb-2">
        <v-chip v-if="route.query.q" size="small" prepend-icon="mdi-magnify" variant="tonal">
          {{ route.query.q }}
        </v-chip>
        <v-chip v-if="route.query.category" size="small" prepend-icon="mdi-tag-outline" variant="tonal">
          {{ route.query.category }}
        </v-chip>
        <v-chip v-if="route.query.inStock === 'true'" size="small" prepend-icon="mdi-check-circle-outline" variant="tonal">
          在庫あり
        </v-chip>
        <span v-if="!route.query.q && !route.query.category && route.query.inStock !== 'true'" class="text-body-2 text-medium-emphasis">
          条件なし（全件）
        </span>
      </div>

      <!-- ローディング -->
      <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mt-2" />

      <template v-else>
        <!-- オフライン通知 -->
        <v-chip
          v-if="isFallback"
          color="warning"
          variant="tonal"
          size="small"
          prepend-icon="mdi-wifi-off"
          class="mt-4 mb-3"
        >
          オフラインモード（モックデータ）
        </v-chip>

        <!-- 件数表示 -->
        <p class="text-body-2 mt-4 mb-3 text-medium-emphasis">{{ displayData.total }}件</p>

        <!-- 商品一覧 -->
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

        <!-- ページネーション -->
        <v-pagination
          v-if="displayData.totalPages > 1"
          :model-value="currentPage"
          :length="displayData.totalPages"
          class="mt-4"
          @update:model-value="onPageChange"
        />
      </template>
    </v-container>

    <!-- クイックビューダイアログ -->
    <ProductDialog
      v-model="dialogOpen"
      :product="selectedProduct"
      @detail="goDetail"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGetProducts } from '@/api/products'
import type { Product, ProductListResponse } from '@/api/products'
import { mockProducts } from '@/mocks/products'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDialog from '@/components/product/ProductDialog.vue'
import type { FooterAction } from '@/types/layout'

const PAGE_SIZE = 5
const router = useRouter()
const route = useRoute()

const currentPage = ref(1)
const selectedProduct = ref<Product | null>(null)
const dialogOpen = ref(false)

const params = computed(() => ({
  q: route.query.q as string | undefined,
  category: route.query.category as Product['category'] | undefined,
  inStock: route.query.inStock === 'true' || undefined,
  page: currentPage.value,
  pageSize: PAGE_SIZE,
}))

const { data, isLoading, isError } = useGetProducts(params)

const mockFallback = computed<ProductListResponse>(() => {
  let filtered = mockProducts as Product[]
  const q = route.query.q as string
  const category = route.query.category as string
  const inStock = route.query.inStock === 'true'
  if (q) filtered = filtered.filter(p => p.name.includes(q) || p.description.includes(q))
  if (category) filtered = filtered.filter(p => p.category === category)
  if (inStock) filtered = filtered.filter(p => p.inStock)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const items = filtered.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE)
  return { items, total, page: currentPage.value, pageSize: PAGE_SIZE, totalPages }
})

const isFallback = computed(() => isError.value)
const displayData = computed<ProductListResponse>(() =>
  isFallback.value ? mockFallback.value : (data.value?.data ?? mockFallback.value)
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

const footerActions: FooterAction[] = [
  { icon: 'mdi-magnify', label: '検索に戻る', onClick: () => router.back() },
  { icon: 'mdi-barcode-scan', label: '読み取り', onClick: () => router.push('/scanner') },
]
</script>
