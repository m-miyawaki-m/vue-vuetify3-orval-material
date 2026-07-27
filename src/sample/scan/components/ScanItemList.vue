<template>
  <div class="list-wrap">
    <div class="count-bar d-flex align-center justify-space-between px-4 py-2">
      <span class="text-subtitle-2">読取済み: {{ items.length }}件</span>
      <v-btn
        v-if="items.length"
        class="clear-btn"
        variant="text"
        color="error"
        size="small"
        @click="emit('clear')"
      >クリア</v-btn>
    </div>

    <div class="card-scroll px-4 pb-4">
      <v-card
        v-for="(item, i) in items"
        :key="`${item.timestamp}-${i}`"
        class="scan-item-card mb-2"
        variant="outlined"
      >
        <v-card-text class="py-2 d-flex justify-space-between align-start">
          <div class="min-width-0">
            <template v-if="fields.length">
              <p v-for="f in fields" :key="f.key" class="text-body-2">
                <span class="text-medium-emphasis">{{ f.label }}: </span>{{ item.fields[f.key] ?? '' }}
              </p>
            </template>
            <template v-else>
              <p class="text-body-2" style="word-break: break-all">読取値: {{ item.raw }}</p>
              <p class="text-caption text-medium-emphasis">
                形式: {{ item.format }} / {{ formatTime(item.timestamp) }}
              </p>
            </template>
          </div>
          <v-btn
            class="remove-btn"
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            @click="emit('remove', i)"
          />
        </v-card-text>
      </v-card>

      <p v-if="!items.length" class="text-caption text-medium-emphasis pa-4 text-center">
        読み取り結果がありません
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScanFieldDef, ScanItem } from '../types'

defineProps<{
  items: ScanItem[]
  fields: ScanFieldDef[]
}>()
const emit = defineEmits<{ remove: [index: number]; clear: [] }>()

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}
</script>

<style scoped>
/* 件数バー固定・カード部のみ縦スクロール(横スクロールなし) */
.list-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.count-bar {
  flex: none;
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
