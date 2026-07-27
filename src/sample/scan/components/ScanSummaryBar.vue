<template>
  <div class="px-4 py-2">
    <p class="text-subtitle-2">読取済み: {{ count }}件</p>
    <p v-if="latest" class="text-caption text-medium-emphasis text-truncate">
      直近: {{ latestText }}
    </p>
    <p v-else class="text-caption text-medium-emphasis">読み取り結果がここに表示されます</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScanFieldDef, ScanItem } from '../types'

const props = defineProps<{
  count: number
  latest: ScanItem | null
  fields: ScanFieldDef[]
}>()

const latestText = computed(() => {
  const item = props.latest
  if (!item) return ''
  if (!props.fields.length) return item.raw
  return props.fields.map((f) => item.fields[f.key] ?? '').join(' / ')
})
</script>
