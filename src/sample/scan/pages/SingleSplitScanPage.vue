<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView
      ref="cameraRef"
      :scan-type="scanType"
      @scan="handleScan"
      @manual-request="openManual"
    />
    <p class="text-caption text-medium-emphasis pa-4">
      「商品コード,ロット,数量」形式のコードを読み取ると、分割して各項目に代入します
    </p>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
      <v-btn
        v-if="scanType === 'ocr'"
        class="shutter-btn"
        icon="mdi-camera"
        color="primary"
        aria-label="撮影"
        @click="cameraRef?.captureOcr()"
      />
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title, manualOpen, openManual, handleManualSubmit } =
  useScanScreen(getPattern('single-split'))

const cameraRef = ref<InstanceType<typeof ScanCameraView> | null>(null)
</script>
