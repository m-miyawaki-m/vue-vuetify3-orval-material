<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView
      ref="cameraRef"
      :scan-type="scanType"
      @scan="handleScan"
      @manual-request="openManual"
    />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <ScanOcrConfirmDialog
      :model-value="pendingOcrItem !== null"
      :item="pendingOcrItem"
      :field-defs="fields"
      :parser="parser"
      @confirm="confirmOcr"
      @discard="discardOcr"
    />
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
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const {
  scanType, count, latest, fields, parser,
  handleScan, finish, cancel, title,
  pendingOcrItem, confirmOcr, discardOcr,
  manualOpen, openManual, handleManualSubmit,
} = useScanScreen(getPattern('list-raw'))

const cameraRef = ref<InstanceType<typeof ScanCameraView> | null>(null)
</script>
