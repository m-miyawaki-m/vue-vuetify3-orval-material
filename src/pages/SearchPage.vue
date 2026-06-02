<template>
  <v-layout>
    <AppHeader title="商品検索" :show-back="true" />
    <v-main>
      <v-container class="pb-6">
        <!-- キーワード検索 -->
        <v-text-field
          v-model="store.keyword"
          label="キーワード検索"
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
          class="mt-4"
          @update:model-value="store.resetPage()"
        />

        <!-- 詳細検索（アコーディオン） -->
        <v-expansion-panels class="mb-4">
          <v-expansion-panel>
            <v-expansion-panel-title>詳細検索</v-expansion-panel-title>
            <v-expansion-panel-text>
              <p class="text-subtitle-2 mb-1">カテゴリ</p>
              <v-radio-group
                v-model="store.selectedCategory"
                inline
                class="mb-3"
                @update:model-value="store.resetPage()"
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
                v-model="store.inStockOnly"
                label="在庫ありのみ表示"
                color="primary"
                hide-details
                @update:model-value="store.resetPage()"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- 件数表示 -->
        <p class="text-body-2 mb-3 text-medium-emphasis">
          {{ store.filteredProducts.length }}件
        </p>

        <!-- 商品一覧 -->
        <template v-if="store.pagedProducts.length > 0">
          <ProductCard
            v-for="product in store.pagedProducts"
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
          v-if="store.totalPages > 1"
          v-model="store.currentPage"
          :length="store.totalPages"
          class="mt-4"
        />
      </v-container>
    </v-main>
    <AppFooter />

    <!-- クイックビューダイアログ -->
    <ProductDialog
      v-model="dialogOpen"
      :product="store.selectedProduct"
      @detail="goDetail"
    />
  </v-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import type { Product } from '@/types/product'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDialog from '@/components/product/ProductDialog.vue'

const store = useProductStore()
const router = useRouter()
const dialogOpen = ref(false)

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ'] as const

function openDialog(product: Product) {
  store.selectProduct(product)
  dialogOpen.value = true
}

function goDetail(product: Product) {
  dialogOpen.value = false
  store.selectProduct(product)
  router.push(`/detail/${product.id}`)
}
</script>
