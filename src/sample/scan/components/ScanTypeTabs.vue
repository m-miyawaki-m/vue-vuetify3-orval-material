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
