<template>
  <v-text-field
    :model-value="modelValue ? formatDate(modelValue) : ''"
    :label="label"
    variant="outlined"
    readonly
    placeholder="yyyy/mm/dd"
  >
    <template #append-inner>
      <v-btn icon="mdi-calendar" variant="text" density="compact" @click="open" />
    </template>
  </v-text-field>

  <v-dialog v-model="dialog" max-width="360">
    <v-card>
      <v-card-title class="pt-4 pl-4">日付を選択</v-card-title>
      <v-date-picker v-model="temp" color="primary" show-adjacent-months elevation="0" />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">キャンセル</v-btn>
        <v-btn color="primary" variant="elevated" @click="confirm">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: Date | null
  label: string
}>()
const emit = defineEmits<{ 'update:modelValue': [Date | null] }>()

const dialog = ref(false)
const temp   = ref<Date | null>(null)

function open() {
  temp.value = props.modelValue
  dialog.value = true
}

function confirm() {
  emit('update:modelValue', temp.value)
  dialog.value = false
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
</script>
