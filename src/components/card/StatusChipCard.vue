<template>
  <v-card @click="handleClick">
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
    <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    <v-card-text v-if="body">
      <p class="text-body-2 text-medium-emphasis">{{ body }}</p>
    </v-card-text>
    <v-card-actions>
      <v-btn variant="text" color="primary" @click.stop="handleClick">
        詳細を見る
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

export interface StatusChip {
  label: string
  color: string
  icon?: string
}

const props = defineProps<{
  title: string
  subtitle?: string
  body?: string
  chips?: StatusChip[]
  to?: string
}>()

const emit = defineEmits<{ detail: [] }>()
const router = useRouter()

function handleClick() {
  if (props.to) router.push(props.to)
  else emit('detail')
}
</script>
