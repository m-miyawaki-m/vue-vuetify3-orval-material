<template>
  <MainLayout title="商品検索" :footer-actions="footerActions">
    <!-- ヘッダー: 戻るボタン -->
    <template #actions>
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
        class="mt-4"
      />

      <!-- 詳細検索（アコーディオン） -->
      <v-expansion-panels class="mb-4">
        <v-expansion-panel>
          <v-expansion-panel-title>詳細検索</v-expansion-panel-title>
          <v-expansion-panel-text>
            <p class="text-subtitle-2 mb-1">カテゴリ</p>
            <v-radio-group v-model="selectedCategory" inline class="mb-3">
              <v-radio label="すべて" value="" />
              <v-radio v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
            </v-radio-group>
            <v-switch
              v-model="inStockOnly"
              label="在庫ありのみ表示"
              color="primary"
              hide-details
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

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

// フォーム入力（ボタン押下まで検索に反映しない）
const keyword = ref('')
const selectedCategory = ref('')
const inStockOnly = ref(false)

// 検索実行済みフラグ・確定済みパラメータ
const hasSearched = ref(false)
const activeParams = ref<GetProductsParams>({ page: 1, pageSize: PAGE_SIZE })

const { data, isLoading, isError } = useGetProducts(activeParams, {
  query: { enabled: hasSearched },
})

// API エラー時はモックデータでフォールバック
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

// ダイアログ
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
