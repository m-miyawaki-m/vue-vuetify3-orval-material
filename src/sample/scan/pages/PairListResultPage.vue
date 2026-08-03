<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="list-wrap">
      <div class="px-4 py-2">
        <span class="text-subtitle-2">読取済み: {{ sets.length }}組</span>
      </div>
      <div class="card-scroll px-4 pb-4">
        <v-card
          v-for="(s, i) in sets"
          :key="`${s.parts[0]?.timestamp}-${i}`"
          class="mb-2"
          variant="outlined"
        >
          <v-card-text class="py-2 d-flex justify-space-between align-start">
            <div class="min-width-0">
              <p
                v-for="(p, j) in s.parts"
                :key="j"
                class="text-body-2"
                style="word-break: break-all"
              >
                <span class="text-medium-emphasis">{{ steps[j].label }}: </span>{{ p.raw }}
              </p>
            </div>
            <v-btn
              class="remove-btn"
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              aria-label="削除"
              @click="removeSet(i)"
            />
          </v-card-text>
        </v-card>
        <p v-if="!sets.length" class="text-caption text-medium-emphasis pa-4 text-center">
          読み取り結果がありません
        </p>
      </div>
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!sets.length" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepResultScreen } from '../logic/useStepResultScreen'

const { sets, rescan, confirm, removeSet, title, steps } = useStepResultScreen(
  getStepPattern('pair-list'),
)
</script>

<style scoped>
/* 件数バー固定・カード部のみ縦スクロール(ScanItemList と同じ構造) */
.list-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.card-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.min-width-0 {
  min-width: 0;
}
</style>
