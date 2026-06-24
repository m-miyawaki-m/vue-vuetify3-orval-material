<template>
  <v-card @click="emit('detail')">
    <v-card-title class="text-body-1 font-weight-bold">{{ title }}</v-card-title>
    <v-card-text class="pt-2">
      <div v-for="(field, i) in fields" :key="i" class="field-row">
        <v-icon size="16" color="medium-emphasis">{{ field.icon }}</v-icon>
        <span class="text-caption text-medium-emphasis label">{{ field.label }}</span>
        <span class="text-body-2" :class="{ 'font-weight-bold': field.bold }">{{ field.value }}</span>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-btn variant="text" color="primary" @click.stop="emit('detail')">
        詳細を見る
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
export interface CardField {
  icon: string
  label: string
  value: string
  bold?: boolean
}

defineProps<{
  title: string
  fields: CardField[]
}>()

const emit = defineEmits<{ detail: [] }>()
</script>

<style scoped>
.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.field-row .label {
  width: 80px;
  flex-shrink: 0;
}
</style>
