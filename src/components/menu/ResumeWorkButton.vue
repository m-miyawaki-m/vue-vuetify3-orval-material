<template>
  <div class="resume-work-wrapper">
    <v-btn
      :color="latestFeature ? 'secondary' : 'surface-variant'"
      variant="flat"
      rounded="xl"
      class="resume-work-btn"
      :disabled="!latestFeature"
      @click="onResume"
    >
      <div class="resume-work-btn__inner">
        <v-icon size="48">mdi-clipboard-play</v-icon>
        <span class="text-subtitle-1 font-weight-bold mt-2">{{ label }}</span>
        <span v-if="latestFeature" class="text-caption mt-1 opacity-80">{{ subLabel }}</span>
      </div>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import router from '@/router'
import { findScanFeature, type ScanFeature } from '@/constants/scanFeatures'
import { findLatestDraft, countDrafts } from '@/db/scanRecordRepository'
import type { ScanSetWithItems } from '@/types/quickScan'

const latestDraft = ref<ScanSetWithItems | null>(null)
const draftCounts = ref<Record<string, number>>({})

const latestFeature = computed<ScanFeature | null>(() =>
  latestDraft.value ? (findScanFeature(latestDraft.value.featureId) ?? null) : null
)

const label = computed(() =>
  latestFeature.value ? `${latestFeature.value.title}作業を再開` : '作業なし'
)

const subLabel = computed(() => {
  if (!latestDraft.value || !latestFeature.value) return ''
  const count = draftCounts.value[latestFeature.value.id] ?? 0
  const time = new Date(latestDraft.value.createdAt)
    .toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return `${count}件 · ${time} 開始`
})

function onResume() {
  if (!latestFeature.value) return
  router.push(`/quick-scan/${latestFeature.value.id}`)
}

onMounted(async () => {
  try {
    const draft = await findLatestDraft()
    const counts = draft ? await countDrafts() : {}
    latestDraft.value = draft
    draftCounts.value = counts
  } catch {
    // DB 初期化失敗時は「作業なし」のまま（再開はできないが他機能に影響させない）
  }
})
</script>

<style scoped>
.resume-work-wrapper {
  padding: 0 24px 28px;
}
.resume-work-btn {
  width: 100%;
  min-height: 160px;
}
.resume-work-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
