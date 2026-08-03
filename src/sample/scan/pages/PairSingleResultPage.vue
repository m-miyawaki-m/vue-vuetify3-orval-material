<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <v-card v-if="firstSet" variant="outlined" class="ma-4">
      <v-card-text>
        <template v-for="(p, i) in firstSet.parts" :key="i">
          <p class="text-overline text-medium-emphasis mb-1">{{ steps[i].label }}</p>
          <p class="text-body-1 font-weight-bold mb-1" style="word-break: break-all">
            {{ p.raw }}
          </p>
          <p class="text-caption text-medium-emphasis mb-3">
            形式: {{ p.format }} / {{ formatTime(p.timestamp) }}
          </p>
        </template>
      </v-card-text>
    </v-card>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!firstSet" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepResultScreen } from '../logic/useStepResultScreen'

const { firstSet, rescan, confirm, title, steps } = useStepResultScreen(
  getStepPattern('pair-single'),
)

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}
</script>
