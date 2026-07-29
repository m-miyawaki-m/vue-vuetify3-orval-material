<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      「商品コード,ロット,数量」形式のコードを読み取ると、分割して各項目に代入します
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

const { scanType, handleScan, cancel, title } = useScanScreen(getPattern('single-split'))
</script>
