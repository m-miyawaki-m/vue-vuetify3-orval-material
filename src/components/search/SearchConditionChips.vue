<template>
  <div class="d-flex flex-wrap align-center gap-1">
    <v-chip v-if="q" size="small" prepend-icon="mdi-magnify" variant="tonal"
      :closable="closable" @click:close="emit('remove', 'q')">
      {{ q }}
    </v-chip>
    <v-chip v-if="category" size="small" prepend-icon="mdi-tag-outline" variant="tonal"
      :closable="closable" @click:close="emit('remove', 'category')">
      {{ category }}
    </v-chip>
    <v-chip v-if="inStock" size="small" prepend-icon="mdi-check-circle-outline" variant="tonal"
      :closable="closable" @click:close="emit('remove', 'inStock')">
      在庫あり
    </v-chip>
    <span v-if="!q && !category && !inStock" class="text-body-2 text-medium-emphasis">
      条件なし（全件）
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  q?: string
  category?: string
  inStock?: boolean
  closable?: boolean
}>()

const emit = defineEmits<{
  remove: [key: 'q' | 'category' | 'inStock']
}>()
</script>
