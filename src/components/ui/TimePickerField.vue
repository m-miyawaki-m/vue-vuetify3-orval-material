<template>
  <v-text-field
    v-bind="$attrs"
    :model-value="modelValue ?? ''"
    :label="label"
    variant="outlined"
    readonly
    placeholder="HH:mm"
  >
    <template #append-inner>
      <v-btn icon="mdi-clock-outline" variant="text" density="compact" @click="open" />
    </template>
  </v-text-field>

  <v-dialog v-model="dialog" max-width="360">
    <v-card>
      <v-card-title class="pt-4 px-4">時刻を選択</v-card-title>
      <div class="d-flex justify-center py-2">
        <v-time-picker v-model="temp" format="24hr" color="primary" elevation="0" />
      </div>
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

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue: string | null
  label: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const dialog = ref(false)
const temp = ref<string | null>(null)

function open() {
  temp.value = props.modelValue
  dialog.value = true
}

function confirm() {
  emit('update:modelValue', temp.value)
  dialog.value = false
}
</script>
