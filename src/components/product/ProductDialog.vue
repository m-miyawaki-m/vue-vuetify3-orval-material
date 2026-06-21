<template>
  <BaseDialog v-model="model" :title="product?.name ?? ''">
    <template v-if="product">
      <p class="text-caption text-medium-emphasis mb-2">{{ product.category }}</p>
      <div class="d-flex align-center ga-2 mb-3">
        <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
        <v-chip :color="product.inStock ? 'success' : 'error'" variant="tonal">
          {{ product.inStock ? '在庫あり' : '在庫なし' }}
        </v-chip>
      </div>
      <v-rating :model-value="product.rating" readonly color="amber" class="mb-3" />
      <p>{{ product.description }}</p>
    </template>
    <template v-if="product" #actions>
      <v-spacer />
      <v-btn variant="text" @click="model = false">閉じる</v-btn>
      <v-btn color="primary" variant="elevated" @click="onDetail">詳細を見る</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'
import BaseDialog from '@/components/dialog/BaseDialog.vue'

const model = defineModel<boolean>()
const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{ detail: [product: Product] }>()

function onDetail() {
  if (props.product) emit('detail', props.product)
}
</script>
