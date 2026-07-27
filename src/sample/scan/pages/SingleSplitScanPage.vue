<template>
  <ScanFixedLayout :title="title">
    <ScanTypeTabs v-model="scanType" />
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <p class="text-caption text-medium-emphasis pa-4">
      「商品コード,ロット,数量」形式のコードを読み取ると、分割して各項目に代入します
    </p>
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title } = useScanScreen(getPattern('single-split'))
</script>
