<template>
  <div>
    <div class="d-flex align-center gap-2 mb-1">
      <v-text-field
        :model-value="start ? formatDate(start) : ''"
        :label="labelStart"
        variant="outlined"
        readonly
        placeholder="yyyy/mm/dd"
        hide-details
        style="flex:1"
      />
      <span class="text-body-2 mx-1">〜</span>
      <v-text-field
        :model-value="end ? formatDate(end) : ''"
        :label="labelEnd"
        variant="outlined"
        readonly
        placeholder="yyyy/mm/dd"
        hide-details
        style="flex:1"
      />
      <v-btn icon="mdi-calendar-range" variant="tonal" color="primary" class="ml-1" @click="open" />
    </div>

    <v-dialog v-model="dialog" max-width="360">
      <v-card>
        <v-card-title class="pt-4 pl-4">期間を選択</v-card-title>
        <v-card-subtitle class="pb-0 pl-4">
          {{ temp.length === 0 ? '開始日をタップ' : temp.length === 1 ? '終了日をタップ' : '期間が選択されました' }}
        </v-card-subtitle>
        <v-date-picker v-model="temp" color="primary" show-adjacent-months multiple="range" elevation="0" />
        <v-card-actions>
          <v-btn variant="text" @click="temp = []">クリア</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :disabled="temp.length < 2"
            @click="confirm"
          >OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  start:      Date | null
  end:        Date | null
  labelStart?: string
  labelEnd?:   string
}>(), {
  labelStart: '開始日',
  labelEnd:   '終了日',
})

const emit = defineEmits<{
  'update:start': [Date | null]
  'update:end':   [Date | null]
}>()

const dialog = ref(false)
const temp   = ref<Date[]>([])

function open() {
  temp.value = [props.start, props.end].filter(Boolean) as Date[]
  dialog.value = true
}

function confirm() {
  emit('update:start', temp.value[0] ?? null)
  emit('update:end',   temp.value[temp.value.length - 1] ?? null)
  dialog.value = false
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
</script>
