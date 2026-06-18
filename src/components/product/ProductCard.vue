<template>
  <v-card class="mb-3" @click="emit('click', product)">
    <v-card-title class="text-body-1 font-weight-bold">{{ product.name }}</v-card-title>
    <v-card-subtitle>{{ product.category }}</v-card-subtitle>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-2">
        <v-chip
          :color="memoStore.hasMemo(product.id) ? 'success' : 'default'"
          size="small"
          variant="tonal"
          :prepend-icon="memoStore.hasMemo(product.id) ? 'mdi-check-circle' : 'mdi-circle-outline'"
        >
          {{ memoStore.hasMemo(product.id) ? '入力済み' : '未入力' }}
        </v-chip>
        <v-chip
          :color="product.inStock ? 'success' : 'error'"
          size="small"
          variant="tonal"
        >
          {{ product.inStock ? '在庫あり' : '在庫なし' }}
        </v-chip>
      </div>
      <v-rating
        :model-value="product.rating"
        density="compact"
        readonly
        size="small"
        color="amber"
        class="mb-1"
      />
      <p class="text-body-2 text-medium-emphasis">{{ product.description }}</p>
    </v-card-text>
    <v-card-actions>
      <v-btn
        variant="text"
        color="primary"
        @click.stop="emit('detail', product)"
      >
        詳細を見る
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'
import { useMemoStore } from '@/stores/memo'

defineProps<{ product: Product }>()
const memoStore = useMemoStore()
const emit = defineEmits<{
  click: [product: Product]
  detail: [product: Product]
}>()
</script>
