<template>
  <v-card @click="emit('detail')">
    <v-card-title class="text-body-1 font-weight-bold">{{ title }}</v-card-title>
    <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    <v-card-text v-if="body">
      <p class="text-body-2 text-medium-emphasis">{{ body }}</p>
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
defineProps<{
  title: string
  subtitle?: string
  body?: string
}>()

const emit = defineEmits<{ detail: [] }>()
</script>
