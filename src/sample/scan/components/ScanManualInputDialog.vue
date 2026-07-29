<template>
  <v-dialog
    :model-value="modelValue"
    max-width="360"
    eager
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-subtitle-1">手入力</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="text"
          label="読取値"
          variant="outlined"
          density="compact"
          hide-details
          autofocus
          @keydown.enter="submit"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn class="close-btn" variant="text" @click="emit('update:modelValue', false)">
          閉じる
        </v-btn>
        <v-btn class="submit-btn" color="primary" variant="tonal" @click="submit">
          追加
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [text: string]
}>()

const text = ref('')

// 追加後も開いたまま入力欄だけクリアする(連続モードでの連続入力対応)。
// 単発モードは親ページが結果画面へ遷移しアンマウントされるため自然に閉じる
function submit() {
  const v = text.value.trim()
  if (!v) return
  emit('submit', v)
  text.value = ''
}
</script>
