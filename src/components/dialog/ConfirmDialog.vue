<template>
  <BaseDialog v-model="model" :title="title" max-width="400px">
    <p>{{ message }}</p>
    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="$emit('cancel')">キャンセル</v-btn>
      <v-btn color="primary" variant="elevated" @click="$emit('confirm')">OK</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'

defineProps<{
  title: string
  message: string
}>()

const model = defineModel<boolean>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
