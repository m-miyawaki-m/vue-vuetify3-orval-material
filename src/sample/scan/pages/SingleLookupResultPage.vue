<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="pa-4">
      <p class="text-caption text-medium-emphasis mb-3" style="word-break: break-all">
        読取値: {{ single?.raw }}
      </p>

      <v-alert v-if="!isValidId" type="warning" density="compact">
        商品コードが数値ではありません
      </v-alert>
      <v-card v-else variant="outlined">
        <v-card-text>
          <div v-if="isLoading" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" />
            <p class="text-caption text-medium-emphasis mt-2">照会中...</p>
          </div>
          <template v-else-if="product">
            <p class="text-overline text-medium-emphasis mb-1">商品情報</p>
            <p class="text-body-1 font-weight-bold mb-2">{{ product.name }}</p>
            <p class="text-body-2">価格: ¥{{ product.price.toLocaleString() }}</p>
            <p class="text-body-2">在庫: {{ product.inStock ? 'あり' : 'なし' }}</p>
            <p class="text-caption text-medium-emphasis mt-2">{{ product.description }}</p>
          </template>
          <p v-else class="text-body-2 text-medium-emphasis">該当する商品が見つかりません</p>
        </v-card-text>
      </v-card>
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!product" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'
import { useProductDetail } from '@/composables/queries/useProductDetail'

const { single, rescan, confirm, title } = useResultScreen(getPattern('single-lookup'))

const rawValue = computed(() => single.value?.raw ?? '')
const isValidId = computed(() => /^\d+$/.test(rawValue.value))
const productId = computed<number | null>(() =>
  isValidId.value ? Number.parseInt(rawValue.value, 10) : null,
)
const { product, isLoading } = useProductDetail(productId)
</script>
