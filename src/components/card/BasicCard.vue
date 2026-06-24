<template>
  <v-card @click="handleClick">
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

const props = defineProps<{
  title: string
  subtitle?: string
  body?: string
  to?: string
}>()

const emit = defineEmits<{ detail: [] }>()
const router = useRouter()

function handleClick() {
  if (props.to) router.push(props.to)
  else emit('detail')
}
</script>
