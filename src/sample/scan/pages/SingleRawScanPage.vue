<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      読み取ると結果画面へ遷移します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title } = useScanScreen(getPattern('single-raw'))
</script>
