<template>
  <v-card variant="outlined" class="ma-4">
    <v-card-text>
      <p class="text-overline text-medium-emphasis mb-1">読取値</p>
      <p class="text-body-1 font-weight-bold mb-3" style="word-break: break-all">
        {{ item.raw }}
      </p>
      <p class="text-caption text-medium-emphasis">形式: {{ item.format }}</p>
      <p class="text-caption text-medium-emphasis">時刻: {{ time }}</p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScanItem } from '../types'

const props = defineProps<{ item: ScanItem }>()
const time = computed(() => new Date(props.item.timestamp).toLocaleTimeString())
</script>
