<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <ScanResultCard v-if="single" :item="single" />
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanResultCard from '../components/ScanResultCard.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const { single, rescan, confirm, title } = useResultScreen(getPattern('single-raw'))
</script>
