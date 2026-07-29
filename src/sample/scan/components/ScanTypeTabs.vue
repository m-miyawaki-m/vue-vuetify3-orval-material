<template>
  <v-tabs
    :model-value="modelValue"
    density="compact"
    grow
    color="primary"
    @update:model-value="emit('update:modelValue', $event as ScanType)"
  >
    <v-tab value="qr">QR</v-tab>
    <v-tab value="barcode">バーコード</v-tab>
    <v-tab value="ocr">OCR</v-tab>
  </v-tabs>
</template>

<script setup lang="ts">
import type { ScanType } from '../types'

defineProps<{ modelValue: ScanType }>()
const emit = defineEmits<{ 'update:modelValue': [value: ScanType] }>()
</script>

<style scoped>
/* v-tabs のデフォルト flex: 1 1 auto は縦 flex(.scan-fixed)内で
   余白いっぱいに伸びてタブ下に黒い空白を作るため固定する */
.v-tabs {
  flex: none;
}
</style>
