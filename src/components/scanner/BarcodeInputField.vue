<template>
  <v-text-field
    :model-value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :hint="hint"
    :clearable="clearable"
    :disabled="disabled"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event as string)"
  >
    <template #append-inner>
      <v-btn
        icon
        size="x-small"
        variant="text"
        :disabled="disabled"
        tabindex="-1"
        @click.stop="scannerOpen = true"
      >
        <v-icon>mdi-barcode-scan</v-icon>
      </v-btn>
    </template>
  </v-text-field>

  <BarcodeScannerOverlay
    v-model="scannerOpen"
    mode="single"
    @scan="onScan"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BarcodeScannerOverlay from './BarcodeScannerOverlay.vue'
import type { ScanResult } from '@/types/scanner'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  hint?: string
  clearable?: boolean
  disabled?: boolean
}>(), {
  modelValue: '',
  clearable: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'scan': [result: ScanResult]
}>()

const scannerOpen = ref(false)

function onScan(result: ScanResult) {
  emit('update:modelValue', result.text)
  emit('scan', result)
}
</script>
