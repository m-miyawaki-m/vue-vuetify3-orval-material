<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <template v-if="single">
      <div v-if="isOcr" class="pa-4">
        <p class="text-caption text-medium-emphasis mb-3">OCR 読取のため値を修正できます</p>
        <ScanValueEditForm
          :raw="editRaw"
          :fields="{}"
          :field-defs="[]"
          :parser="pattern.parser"
          @update:raw="editRaw = $event"
        />
      </div>
      <ScanResultCard v-else :item="single" />
    </template>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanResultCard from '../components/ScanResultCard.vue'
import ScanValueEditForm from '../components/ScanValueEditForm.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const pattern = getPattern('single-raw')
const { single, rescan, confirm, title } = useResultScreen(pattern)

// OCR は誤読前提のため値をローカル編集可能にする(確定時の永続化はサンプル対象外)
const isOcr = computed(() => single.value?.format === 'OCR')
const editRaw = ref('')
watch(single, (s) => { editRaw.value = s?.raw ?? '' }, { immediate: true })
</script>
