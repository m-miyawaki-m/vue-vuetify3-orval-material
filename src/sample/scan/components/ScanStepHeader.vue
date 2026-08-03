<template>
  <div class="step-header">
    <v-stepper :model-value="currentIndex + 1" flat class="stepper">
      <v-stepper-header>
        <template v-for="(s, i) in steps" :key="s.key">
          <v-stepper-item :value="i + 1" :title="s.label" :complete="i < currentIndex" />
          <v-divider v-if="i < steps.length - 1" />
        </template>
      </v-stepper-header>
    </v-stepper>
    <p class="step-guide text-body-2 text-center py-1">{{ guide }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScanStepDef } from '../logic/stepPatterns'

const props = defineProps<{ steps: ScanStepDef[]; currentIndex: number }>()

// 組完成の瞬間(currentIndex がステップ数と一致)でも範囲外参照しない
const guide = computed(
  () => props.steps[Math.min(props.currentIndex, props.steps.length - 1)]?.guide ?? '',
)
</script>

<style scoped>
.step-header {
  flex: none;
}
/* カメラ領域を圧迫しないようステッパーを詰める */
.stepper :deep(.v-stepper-item) {
  padding: 8px 16px;
}
</style>
