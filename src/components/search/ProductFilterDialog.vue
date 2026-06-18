<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="pt-4 px-4">絞り込み条件</v-card-title>
      <v-card-text>
        <p class="text-subtitle-2 mb-1">カテゴリ</p>
        <v-radio-group :model-value="category" class="mb-4" @update:model-value="emit('update:category', $event ?? '')">
          <v-radio label="すべて" value="" />
          <v-radio v-for="cat in CATEGORIES" :key="cat" :label="cat" :value="cat" />
        </v-radio-group>
        <v-divider class="mb-4" />
        <v-switch
          :model-value="inStock"
          label="在庫ありのみ表示"
          color="primary"
          hide-details
          @update:model-value="emit('update:inStock', !!$event)"
        />
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-btn variant="text" @click="emit('reset')">リセット</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="emit('update:modelValue', false)">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
export const CATEGORIES = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ'] as const
export type Category = typeof CATEGORIES[number] | ''
</script>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  category: Category
  inStock: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:category': [value: Category]
  'update:inStock': [value: boolean]
  'reset': []
}>()
</script>
