<template>
  <ScanFixedLayout :title="title">
    <ScanTypeTabs v-model="scanType" />
    <ScanCameraView :scan-type="scanType" @scan="handleScan" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeTabs from '../components/ScanTypeTabs.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, count, latest, fields, handleScan, finish, cancel, title } =
  useScanScreen(getPattern('list-split'))
</script>
