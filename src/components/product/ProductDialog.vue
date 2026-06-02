<template>
  <v-dialog v-model="model" max-width="500">
    <v-card v-if="product">
      <v-card-title>{{ product.name }}</v-card-title>
      <v-card-subtitle>{{ product.category }}</v-card-subtitle>
      <v-card-text>
        <div class="d-flex align-center ga-2 mb-3">
          <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
          <v-chip
            :color="product.inStock ? 'success' : 'error'"
            variant="tonal"
          >
            {{ product.inStock ? '在庫あり' : '在庫なし' }}
          </v-chip>
        </div>
        <v-rating
          :model-value="product.rating"
          readonly
          color="amber"
          class="mb-3"
        />
        <p>{{ product.description }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">閉じる</v-btn>
        <v-btn color="primary" variant="elevated" @click="onDetail">詳細を見る</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'

const model = defineModel<boolean>()
const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{ detail: [product: Product] }>()

function onDetail() {
  if (props.product) emit('detail', props.product)
}
</script>
