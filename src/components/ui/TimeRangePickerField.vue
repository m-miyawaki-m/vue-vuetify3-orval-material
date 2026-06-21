<template>
  <div>
    <div class="d-flex align-center gap-2">
      <v-text-field
        :model-value="start ?? ''"
        :label="labelStart"
        variant="outlined"
        readonly
        placeholder="HH:mm"
        hide-details
        style="flex: 1"
      />
      <span class="text-body-2 mx-1">〜</span>
      <v-text-field
        :model-value="end ?? ''"
        :label="labelEnd"
        variant="outlined"
        readonly
        placeholder="HH:mm"
        hide-details
        style="flex: 1"
      />
      <v-btn icon="mdi-clock-start" variant="tonal" color="primary" class="ml-1" @click="open" />
    </div>

    <v-dialog v-model="dialog" max-width="360">
      <v-card>
        <v-card-title class="pt-4 px-4">
          {{ step === 'start' ? '開始時刻を選択' : '終了時刻を選択' }}
        </v-card-title>
        <div class="d-flex justify-center py-2">
          <v-time-picker
            v-if="step === 'start'"
            v-model="tempStart"
            format="24hr"
            color="primary"
            elevation="0"
          />
          <v-time-picker
            v-else
            v-model="tempEnd"
            format="24hr"
            color="primary"
            elevation="0"
            :min="tempStart ?? undefined"
          />
        </div>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
          <v-btn
            v-if="step === 'start'"
            color="primary"
            variant="elevated"
            :disabled="!tempStart"
            @click="step = 'end'"
            >次へ</v-btn
          >
          <v-btn v-else color="primary" variant="elevated" :disabled="!tempEnd" @click="confirm"
            >OK</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    start: string | null
    end: string | null
    labelStart?: string
    labelEnd?: string
  }>(),
  {
    labelStart: '開始時刻',
    labelEnd: '終了時刻',
  }
)

const emit = defineEmits<{
  'update:start': [string | null]
  'update:end': [string | null]
}>()

const dialog = ref(false)
const step = ref<'start' | 'end'>('start')
const tempStart = ref<string | null>(null)
const tempEnd = ref<string | null>(null)

function open() {
  tempStart.value = props.start
  tempEnd.value = props.end
  step.value = 'start'
  dialog.value = true
}

function confirm() {
  emit('update:start', tempStart.value)
  emit('update:end', tempEnd.value)
  dialog.value = false
}
</script>
