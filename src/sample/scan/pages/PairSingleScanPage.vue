<template>
  <ScanFixedLayout :title="title">
    <ScanStepHeader :steps="steps" :current-index="currentStepIndex" />
    <ScanCameraView
      :scan-type="currentStep.accept"
      @scan="handleScan"
      @manual-request="openManual"
    />
    <div class="px-4 py-2">
      <p
        v-for="(p, i) in parts"
        :key="`${p.timestamp}-${i}`"
        class="text-caption text-truncate"
      >
        {{ steps[i].label }}: {{ p.raw }}
      </p>
      <p v-if="!parts.length" class="text-caption text-medium-emphasis">
        読み取った値がここに表示されます
      </p>
    </div>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <v-btn class="step-back-btn" :disabled="!canStepBack" @click="stepBack">1つ戻る</v-btn>
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanStepHeader from '../components/ScanStepHeader.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepScanScreen } from '../logic/useStepScanScreen'

const {
  steps, currentStep, currentStepIndex, parts, canStepBack,
  handleScan, stepBack, cancel, title,
  manualOpen, openManual, handleManualSubmit,
} = useStepScanScreen(getStepPattern('pair-single'))
</script>
