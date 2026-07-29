<template>
  <v-menu location="top" eager>
    <template #activator="{ props: menuProps }">
      <v-btn v-bind="menuProps" class="type-menu-btn" append-icon="mdi-menu-up">
        種別: {{ LABELS[modelValue] }}
      </v-btn>
    </template>
    <v-list density="compact">
      <v-list-item
        v-for="t in TYPES"
        :key="t"
        :active="t === modelValue"
        @click="emit('update:modelValue', t)"
      >
        <v-list-item-title>{{ LABELS[t] }}</v-list-item-title>
        <template #append>
          <v-icon v-if="t === modelValue" icon="mdi-check" size="small" />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import type { ScanType } from '../types'

const TYPES: ScanType[] = ['qr', 'barcode', 'ocr']
const LABELS: Record<ScanType, string> = { qr: 'QR', barcode: 'バーコード', ocr: 'OCR' }

defineProps<{ modelValue: ScanType }>()
const emit = defineEmits<{ 'update:modelValue': [value: ScanType] }>()
</script>
