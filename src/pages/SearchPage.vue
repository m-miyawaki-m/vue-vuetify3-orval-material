<template>
  <MainLayout title="商品検索">
    <v-container class="pb-6">
      <!-- キーワード検索 -->
      <v-text-field
        v-model="keyword"
        label="キーワード検索"
        prepend-inner-icon="mdi-magnify"
        clearable
        variant="outlined"
        class="mt-4"
        @update:model-value="resetPage"
      />

      <!-- 詳細検索（アコーディオン） -->
      <v-expansion-panels class="mb-4">
        <v-expansion-panel>
          <v-expansion-panel-title>詳細検索</v-expansion-panel-title>
          <v-expansion-panel-text>
            <p class="text-subtitle-2 mb-1">カテゴリ</p>
            <v-radio-group
              v-model="selectedCategory"
              inline
              class="mb-3"
              @update:model-value="resetPage"
            >
              <v-radio label="すべて" value="" />
              <v-radio
                v-for="cat in categories"
                :key="cat"
                :label="cat"
                :value="cat"
              />
            </v-radio-group>
            <v-switch
              v-model="inStockOnly"
              label="在庫ありのみ表示"
              color="primary"
              hide-details
              @update:model-value="resetPage"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- ローディング -->
      <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-3" />

      <!-- エラー -->
      <v-alert v-else-if="isError" type="error" variant="tonal" class="mb-3">
        データの取得に失敗しました。
      </v-alert>

      <template v-else>
        <!-- 件数表示 -->
        <p class="text-body-2 mb-3 text-medium-emphasis">
          {{ data?.data.total ?? 0 }}件
        </p>

        <!-- 商品一覧 -->
        <template v-if="(data?.data.items ?? []).length > 0">
          <ProductCard
            v-for="product in data!.data.items"
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
          v-if="(data?.data.totalPages ?? 1) > 1"
          v-model="currentPage"
          :length="data!.data.totalPages"
          class="mt-4"
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
import type { Product } from '@/api/products'
import MainLayout from '@/components/layout/MainLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDialog from '@/components/product/ProductDialog.vue'

const router = useRouter()

const keyword = ref('')
const selectedCategory = ref('')
const inStockOnly = ref(false)
const currentPage = ref(1)
const selectedProduct = ref<Product | null>(null)
const dialogOpen = ref(false)

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ'] as const

const params = computed(() => ({
  q: keyword.value || undefined,
  category: (selectedCategory.value || undefined) as Product['category'] | undefined,
  inStock: inStockOnly.value || undefined,
  page: currentPage.value,
  pageSize: 5,
}))

const { data, isLoading, isError } = useGetProducts(params)

function resetPage() {
  currentPage.value = 1
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
