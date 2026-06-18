<template>
  <SubLayout title="コンポーネントサンプル">
    <div class="sample-layout">
      <div class="sample-tabs">
        <v-tabs v-model="activeTab" color="primary" align-tabs="start">
          <v-tab value="input">入力・選択</v-tab>
          <v-tab value="display">表示制御</v-tab>
          <v-tab value="dialog">ダイアログ</v-tab>
          <v-tab value="notification">通知</v-tab>
          <v-tab value="scanner">スキャナー</v-tab>
        </v-tabs>
      </div>
      <div class="sample-content">
        <v-window v-model="activeTab">
          <v-window-item value="input"><SampleInputTab /></v-window-item>
          <v-window-item value="display"><SampleDisplayTab /></v-window-item>
          <v-window-item value="dialog"><SampleDialogTab /></v-window-item>
          <v-window-item value="notification"><SampleNotificationTab /></v-window-item>
          <v-window-item value="scanner"><SampleScannerTab /></v-window-item>
        </v-window>
      </div>
    </div>
  </SubLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import SampleInputTab from '@/components/sample/SampleInputTab.vue'
import SampleDisplayTab from '@/components/sample/SampleDisplayTab.vue'
import SampleDialogTab from '@/components/sample/SampleDialogTab.vue'
import SampleNotificationTab from '@/components/sample/SampleNotificationTab.vue'
import SampleScannerTab from '@/components/sample/SampleScannerTab.vue'

const activeTab = ref('input')
</script>

<style scoped>
.sample-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sample-tabs {
  flex-shrink: 0;
  background: rgb(var(--v-theme-background));
}
.sample-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
