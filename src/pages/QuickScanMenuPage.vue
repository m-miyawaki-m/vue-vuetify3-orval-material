<template>
  <MainLayout title="クイックスキャン" hide-footer>
    <template #prepend>
      <v-btn icon @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>

    <div class="feature-list">
      <v-btn
        v-for="feature in scanFeatures"
        :key="feature.id"
        :color="feature.color"
        variant="flat"
        rounded="xl"
        class="quick-scan-feature-btn"
        @click="router.push(`/quick-scan/${feature.id}`)"
      >
        <div class="quick-scan-feature-btn__inner">
          <v-badge
            v-if="draftCounts[feature.id]"
            :content="draftCounts[feature.id]"
            color="error"
            offset-x="-4"
            offset-y="-4"
          >
            <v-icon size="48">{{ feature.icon }}</v-icon>
          </v-badge>
          <v-icon v-else size="48">{{ feature.icon }}</v-icon>
          <span class="text-subtitle-1 font-weight-bold mt-2">{{ feature.title }}</span>
        </div>
      </v-btn>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import router from '@/router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { scanFeatures } from '@/constants/scanFeatures'
import { countDrafts } from '@/db/scanRecordRepository'

const draftCounts = ref<Record<string, number>>({})

onMounted(async () => {
  try {
    draftCounts.value = await countDrafts()
  } catch {
    // バッジは補助情報のため、DB 初期化失敗時は非表示のまま進む
  }
})
</script>

<style scoped>
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}
.quick-scan-feature-btn {
  width: 100%;
  min-height: 120px;
}
.quick-scan-feature-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
