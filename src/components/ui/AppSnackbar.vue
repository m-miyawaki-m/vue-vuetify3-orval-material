<template>
  <v-snackbar v-model="state.show" :color="state.color" :timeout="2500" location="bottom">
    <v-icon start>{{ state.icon }}</v-icon
    >{{ state.text }}
    <template #actions>
      <v-btn variant="text" @click="state.show = false">閉じる</v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { useSnackbar } from '@/composables/useSnackbar'
const { state } = useSnackbar()
</script>
