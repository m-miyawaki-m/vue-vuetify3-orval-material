<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <ScanOcrConfirmDialog
      :model-value="pendingOcrItem !== null"
      :item="pendingOcrItem"
      :field-defs="fields"
      :parser="parser"
      @confirm="confirmOcr"
      @discard="discardOcr"
    />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const {
  scanType, count, latest, fields, parser,
  handleScan, finish, cancel, title,
  pendingOcrItem, confirmOcr, discardOcr,
} = useScanScreen(getPattern('list-split'))
</script>
