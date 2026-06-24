<template>
  <v-card @click="emit('detail')">
    <div v-if="chips?.length" class="px-4 pt-3 pb-0 d-flex ga-2">
      <v-chip
        v-for="(chip, i) in chips"
        :key="i"
        :color="chip.color"
        :prepend-icon="chip.icon"
        size="x-small"
        variant="tonal"
      >{{ chip.label }}</v-chip>
    </div>
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
      <v-spacer />
      <v-btn
        v-for="(action, i) in actions"
        :key="i"
        :color="action.color ?? 'primary'"
        :prepend-icon="action.icon"
        variant="tonal"
        size="small"
        @click.stop="emit('action', i)"
      >{{ action.label }}</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
export interface ComboChip {
  label: string
  color: string
  icon?: string
}

export interface ComboField {
  icon: string
  label: string
  value: string
  bold?: boolean
}

export interface ComboAction {
  label: string
  icon: string
  color?: string
}

defineProps<{
  title: string
  chips?: ComboChip[]
  fields: ComboField[]
  actions?: ComboAction[]
}>()

const emit = defineEmits<{
  detail: []
  action: [index: number]
}>()
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
