<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="pa-4">
      <p v-if="isOcr" class="text-caption text-medium-emphasis mb-3">
        OCR 読取のため値と項目を修正できます
      </p>
      <ScanValueEditForm
        :raw="editRaw"
        :fields="editFields"
        :field-defs="fields"
        :parser="pattern.parser"
        :raw-editable="isOcr"
        @update:raw="editRaw = $event"
        @update:fields="editFields = $event"
      />
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const pattern = getPattern('single-split')
const { single, fields, rescan, confirm, title } = useResultScreen(pattern)

// 分割結果をローカル編集用に展開。OCR のときは raw も編集可能(編集で自動再分割)
const isOcr = computed(() => single.value?.format === 'OCR')
const editRaw = ref('')
const editFields = ref<Record<string, string>>({})
watch(
  single,
  (s) => {
    editRaw.value = s?.raw ?? ''
    editFields.value = { ...(s?.fields ?? {}) }
  },
  { immediate: true },
)
</script>
