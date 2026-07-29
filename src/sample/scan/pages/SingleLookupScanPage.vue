<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" @manual-request="openManual" />
    <p class="text-caption text-medium-emphasis pa-4">
      商品コード(数値)を読み取ると、API で商品情報を照会して表示します
    </p>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title, manualOpen, openManual, handleManualSubmit } =
  useScanScreen(getPattern('single-lookup'))
</script>
