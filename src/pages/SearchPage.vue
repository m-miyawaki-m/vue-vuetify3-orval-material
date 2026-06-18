<template>
  <MainLayout title="商品検索" :footer-actions="footerActions">
    <!-- ヘッダー: 戻るボタン -->
    <template #actions>
      <v-btn icon variant="text" @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <v-container class="pb-6">
      <!-- キーワード + 詳細検索ボタン -->
      <div class="d-flex align-center gap-2 mt-4 mb-4">
        <v-text-field
          v-model="keyword"
          label="キーワード検索"
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
          hide-details
          class="flex-grow-1"
        />
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
        <v-chip
          v-if="selectedCategory"
          size="small"
          closable
          @click:close="selectedCategory = ''"
        >
          {{ selectedCategory }}
        </v-chip>
        <v-chip v-if="inStockOnly" size="small" closable @click:close="inStockOnly = false">
          在庫あり
        </v-chip>
      </div>

      <!-- 未検索 -->
      <v-alert v-if="!hasSearched" type="info" variant="tonal">
        条件を入力して検索ボタンを押してください。
      </v-alert>

      <!-- ローディング -->
      <v-progress-linear v-else-if="isLoading" indeterminate color="primary" class="mb-3" />

      <template v-else>
        <!-- オフライン通知 -->
        <v-chip
          v-if="isFallback"
          color="warning"
          variant="tonal"
          size="small"
          prepend-icon="mdi-wifi-off"
          class="mb-3"
        >
          オフラインモード（モックデータ）
        </v-chip>

        <!-- 件数表示 -->
        <p class="text-body-2 mb-3 text-medium-emphasis">{{ displayData.total }}件</p>

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
          :model-value="activeParams.page"
          :length="displayData.totalPages"
          class="mt-4"
          @update:model-value="onPageChange"
        />
      </template>
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
import { useRouter } from 'vue-router'
import { useGetProducts } from '@/api/products'
import type { Product, ProductListResponse, GetProductsParams } from '@/api/products'
import { mockProducts } from '@/mocks/products'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDialog from '@/components/product/ProductDialog.vue'
import type { FooterAction } from '@/types/layout'

const PAGE_SIZE = 5
const router = useRouter()

const keyword = ref('')
const selectedCategory = ref('')
const inStockOnly = ref(false)
const filterDialog = ref(false)

const hasSearched = ref(false)
const activeParams = ref<GetProductsParams>({ page: 1, pageSize: PAGE_SIZE })

const { data, isLoading, isError } = useGetProducts(activeParams, {
  query: { enabled: hasSearched },
})

const mockFallback = computed<ProductListResponse>(() => {
  let filtered = mockProducts as Product[]
  const p = activeParams.value
  if (p.q) filtered = filtered.filter(f => f.name.includes(p.q!) || f.description.includes(p.q!))
  if (p.category) filtered = filtered.filter(f => f.category === p.category)
  if (p.inStock) filtered = filtered.filter(f => f.inStock)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = p.page ?? 1
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  return { items, total, page, pageSize: PAGE_SIZE, totalPages }
})

const isFallback = computed(() => isError.value)
const displayData = computed<ProductListResponse>(() =>
  isFallback.value ? mockFallback.value : (data.value?.data ?? mockFallback.value)
)

const selectedProduct = ref<Product | null>(null)
const dialogOpen = ref(false)

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ'] as const

function search() {
  activeParams.value = {
    q: keyword.value || undefined,
    category: (selectedCategory.value || undefined) as Product['category'] | undefined,
    inStock: inStockOnly.value || undefined,
    page: 1,
    pageSize: PAGE_SIZE,
  }
  hasSearched.value = true
}

function clearFilter() {
  selectedCategory.value = ''
  inStockOnly.value = false
}

function onPageChange(page: number) {
  activeParams.value = { ...activeParams.value, page }
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
  { icon: 'mdi-magnify', label: '検索', onClick: search },
  { icon: 'mdi-barcode-scan', label: '読み取り', onClick: () => router.push('/scanner') },
]
</script>
