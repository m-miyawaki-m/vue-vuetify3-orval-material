<template>
  <v-dialog :model-value="modelValue" max-width="400" persistent eager>
    <v-card>
      <v-card-title class="text-subtitle-1">OCR 読取内容の確認</v-card-title>
      <v-card-text>
        <p class="text-caption text-medium-emphasis mb-3">
          読取結果を確認し、必要なら修正してください
        </p>
        <ScanValueEditForm
          :raw="editRaw"
          :fields="editFields"
          :field-defs="fieldDefs"
          :parser="parser"
          @update:raw="editRaw = $event"
          @update:fields="editFields = $event"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn class="discard-btn" variant="text" @click="emit('discard')">破棄</v-btn>
        <v-btn
          class="confirm-btn"
          color="primary"
          variant="tonal"
          :disabled="!editRaw.trim()"
          @click="onConfirm"
        >追加</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ScanFieldDef, ScanItem } from '../types'
import type { ScanParser } from '../logic/parsers'
import ScanValueEditForm from './ScanValueEditForm.vue'

const props = defineProps<{
  modelValue: boolean
  item: ScanItem | null
  fieldDefs: ScanFieldDef[]
  parser: ScanParser
}>()
const emit = defineEmits<{ confirm: [item: ScanItem]; discard: [] }>()

// 対象 item が変わるたび(=ダイアログが開くたび)にローカル編集用へコピーする
const editRaw = ref('')
const editFields = ref<Record<string, string>>({})
watch(
  () => props.item,
  (item) => {
    editRaw.value = item?.raw ?? ''
    editFields.value = { ...(item?.fields ?? {}) }
  },
  { immediate: true },
)

function onConfirm() {
  if (!props.item) return
  emit('confirm', {
    raw: editRaw.value.trim(),
    format: props.item.format,
    timestamp: props.item.timestamp,
    fields: { ...editFields.value },
  })
}
</script>
