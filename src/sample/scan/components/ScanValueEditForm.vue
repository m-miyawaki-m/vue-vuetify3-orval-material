<template>
  <div class="value-edit-form">
    <v-text-field
      v-if="rawEditable"
      class="raw-input mb-2"
      :model-value="raw"
      label="読取値"
      variant="outlined"
      density="compact"
      @update:model-value="onRawInput"
    />
    <p
      v-else
      class="raw-static text-caption text-medium-emphasis mb-3"
      style="word-break: break-all"
    >
      読取値: {{ raw }}
    </p>

    <v-text-field
      v-for="f in fieldDefs"
      :key="f.key"
      :class="`field-input-${f.key} mb-2`"
      :model-value="fields[f.key] ?? ''"
      :label="f.label"
      variant="outlined"
      density="compact"
      @update:model-value="onFieldInput(f.key, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ScanFieldDef } from '../types'
import type { ScanParser } from '../logic/parsers'

const props = withDefaults(
  defineProps<{
    raw: string
    fields: Record<string, string>
    fieldDefs: ScanFieldDef[]
    parser: ScanParser
    rawEditable?: boolean
  }>(),
  { rawEditable: true },
)
const emit = defineEmits<{
  'update:raw': [value: string]
  'update:fields': [value: Record<string, string>]
}>()

// raw 編集時は parser で項目を自動再分割する。項目の個別編集はマージのみ(raw は触らない)
function onRawInput(v: string) {
  emit('update:raw', v)
  emit('update:fields', props.parser(v))
}
function onFieldInput(key: string, v: string) {
  emit('update:fields', { ...props.fields, [key]: v })
}
</script>
