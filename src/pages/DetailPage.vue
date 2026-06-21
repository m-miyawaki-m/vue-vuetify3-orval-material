<template>
  <SubLayout :title="product?.name ?? '詳細'">
    <template #footer>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-content-save"
        :disabled="!product"
        @click="saveMemo"
      >
        登録
      </v-btn>
    </template>
    <v-container v-if="product" class="pb-6">
      <v-tabs v-model="tab" class="mb-4" color="primary">
        <v-tab value="info">商品情報</v-tab>
        <v-tab value="reviews">レビュー</v-tab>
        <v-tab value="related">関連商品</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <!-- 商品情報タブ -->
        <v-window-item value="info">
          <v-card>
            <v-card-title>{{ product.name }}</v-card-title>
            <v-card-subtitle>{{ product.category }}</v-card-subtitle>
            <v-card-text>
              <p class="text-h5 mb-2">¥{{ product.price.toLocaleString() }}</p>
              <v-chip :color="product.inStock ? 'success' : 'error'" variant="tonal" class="mb-3">
                {{ product.inStock ? '在庫あり' : '在庫なし' }}
              </v-chip>
              <v-rating :model-value="product.rating" readonly color="amber" class="mb-3" />
              <p class="text-body-1">{{ product.description }}</p>
            </v-card-text>
            <v-card-actions>
              <v-btn
                color="primary"
                variant="elevated"
                size="large"
                :disabled="!product.inStock"
                prepend-icon="mdi-cart"
              >
                カートに追加
              </v-btn>
            </v-card-actions>

            <v-divider class="mx-4" />

            <v-card-text>
              <v-textarea
                v-model="localMemo"
                label="メモ"
                placeholder="メモを入力..."
                variant="outlined"
                rows="3"
                auto-grow
                clearable
              />
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- レビュータブ -->
        <v-window-item value="reviews">
          <v-radio-group v-model="reviewFilter" label="評価で絞り込み" inline class="mb-3">
            <v-radio label="すべて" :value="0" />
            <v-radio v-for="n in 5" :key="n" :label="`${n}★`" :value="n" />
          </v-radio-group>
          <v-expansion-panels v-if="filteredReviews.length > 0">
            <v-expansion-panel v-for="review in filteredReviews" :key="review.id">
              <v-expansion-panel-title>
                {{ review.author }}
                <v-rating
                  :model-value="review.rating"
                  readonly
                  density="compact"
                  size="small"
                  color="amber"
                  class="ml-2"
                />
              </v-expansion-panel-title>
              <v-expansion-panel-text>{{ review.comment }}</v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
          <v-alert v-else type="info" variant="tonal"> 該当するレビューがありません。 </v-alert>
        </v-window-item>

        <!-- 関連商品タブ -->
        <v-window-item value="related">
          <template v-if="relatedProducts.length > 0">
            <ProductCard
              v-for="p in relatedProducts"
              :key="p.id"
              :product="p"
              @click="goDetail(p)"
              @detail="goDetail(p)"
            />
          </template>
          <v-alert v-else type="info" variant="tonal"> 関連商品はありません。 </v-alert>
        </v-window-item>
      </v-window>
    </v-container>

    <v-container v-else>
      <v-alert type="error" variant="tonal">商品が見つかりませんでした。</v-alert>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import { useMemoStore } from '@/stores/memo'
import { useSnackbar } from '@/composables/useSnackbar'
import type { Product } from '@/types/product'
import SubLayout from '@/components/layout/SubLayout.vue'
import ProductCard from '@/components/product/ProductCard.vue'

const props = defineProps<{ id: string }>()
const store = useProductStore()
const memoStore = useMemoStore()
const { showSnack } = useSnackbar()
const router = useRouter()

const tab = ref('info')
const reviewFilter = ref(0)
const localMemo = ref('')

const product = computed(() => store.products.find((p) => p.id === Number(props.id)) ?? null)

watch(
  product,
  (p) => {
    localMemo.value = p ? memoStore.getMemo(p.id) : ''
  },
  { immediate: true }
)

function saveMemo() {
  if (!product.value) return
  memoStore.setMemo(product.value.id, localMemo.value)
  showSnack('success', '登録しました')
}

const filteredReviews = computed(() => {
  if (!product.value) return []
  if (reviewFilter.value === 0) return product.value.reviews
  return product.value.reviews.filter((r) => r.rating === reviewFilter.value)
})

const relatedProducts = computed(() => {
  if (!product.value) return []
  return store.products
    .filter((p) => p.category === product.value!.category && p.id !== product.value!.id)
    .slice(0, 4)
})

function goDetail(p: Product) {
  store.selectProduct(p)
  router.push(`/detail/${p.id}`)
}
</script>
