<template>
  <v-layout>
    <div class="d-flex flex-column" style="width: 100%; height: 100dvh; background: #000; overflow: hidden;">

      <!-- ツールバー -->
      <div
        class="d-flex align-center px-3"
        style="height: 52px; background: rgba(0,0,0,0.75); flex-shrink: 0;"
      >
        <v-btn icon variant="text" color="white" size="small" @click="store.cancel()">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="flex-1-1 text-center text-white text-body-1 font-weight-bold">
          {{ store.options?.title ?? '連続スキャン' }}
        </span>
        <div style="width: 36px;" />
      </div>

      <!-- カメラエリア -->
      <div
        class="position-relative d-flex align-center justify-center"
        style="height: 45%; flex-shrink: 0;"
      >
        <video
          ref="videoRef"
          muted
          playsinline
          style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;"
        />
        <div class="scanner-frame" aria-hidden="true">
          <div class="corner tl" /><div class="corner tr" />
          <div class="corner bl" /><div class="corner br" />
          <div class="scanline" />
        </div>
        <div
          v-if="error"
          class="d-flex flex-column align-center justify-center pa-4"
          style="position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 2;"
        >
          <v-icon color="error" size="52">mdi-camera-off</v-icon>
          <p class="text-white text-center mt-4 text-body-2">{{ error }}</p>
        </div>
      </div>

      <!-- DEV モック入力 -->
      <div
        v-if="isDev"
        class="d-flex align-center gap-2 px-3 py-2"
        style="background: rgba(255,165,0,0.15); border-top: 1px solid rgba(255,165,0,0.4); flex-shrink: 0;"
      >
        <v-text-field
          v-model="mockValue"
          label="DEV: モック入力"
          density="compact"
          variant="outlined"
          hide-details
          bg-color="#1a1a1a"
          style="flex: 1;"
          @keydown.enter="onMockScan"
        />
        <v-btn color="orange" variant="elevated" size="small" @click="onMockScan">確定</v-btn>
      </div>

      <!-- スキャン済みリスト -->
      <div style="flex: 1; overflow-y: auto; background: #111;">
        <p class="text-caption text-medium-emphasis pa-2 pb-1">
          スキャン済み（{{ items.length }}件）
        </p>
        <v-list density="compact" bg-color="transparent">
          <v-list-item
            v-for="item in items"
            :key="item.id"
          >
            <template #title>
              <span class="text-white text-body-2">{{ item.raw }}</span>
            </template>
            <template #subtitle>
              <span v-if="item.resolving" class="text-medium-emphasis text-caption">⏳ 解決中...</span>
              <span v-else-if="item.resolveError" class="text-error text-caption">❌ {{ item.resolveError }}</span>
              <span v-else-if="item.resolved !== undefined" class="text-success text-caption">
                {{ displayResolved(item.resolved) }}
              </span>
              <span v-else class="text-medium-emphasis text-caption">{{ item.format }}</span>
            </template>
            <template #append>
              <v-btn icon size="x-small" variant="text" color="white" @click="removeItem(item.id)">
                <v-icon size="16">mdi-close</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <!-- フッター -->
      <div
        class="d-flex align-center gap-2 pa-2"
        style="background: rgba(0,0,0,0.85); flex-shrink: 0;"
      >
        <v-btn
          color="error"
          variant="text"
          size="small"
          prepend-icon="mdi-delete-outline"
          @click="items.value = []"
        >クリア</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          style="flex: 1;"
          :disabled="items.length === 0"
          @click="onComplete"
        >
          {{ store.options?.confirmLabel ?? '確定' }}（{{ items.length }}件）
        </v-btn>
      </div>

    </div>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useScanListStore } from '@/stores/scanListStore'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanListItem } from '@/types/scanList'

const isDev = import.meta.env.DEV
const store = useScanListStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const items = ref<ScanListItem[]>([])
const mockValue = ref('')
let itemIndex = 0
let completing = false

const { start, stop, error } = useBarcodeScanner(videoRef, {
  onScan(result) {
    addItem(result.text, result.format)
  },
})

function addItem(text: string, format: string) {
  const id = `${Date.now()}-${itemIndex++}`
  const item: ScanListItem = { id, raw: text, format, timestamp: Date.now(), resolving: false }
  items.value.push(item)

  const resolver = store.options?.resolver
  if (!resolver) return

  item.resolving = true
  resolver(text)
    .then((resolved) => {
      item.resolved = resolved
      item.resolving = false
    })
    .catch((e) => {
      item.resolveError = e instanceof Error ? e.message : '取得失敗'
      item.resolving = false
    })
}

function removeItem(id: string) {
  items.value = items.value.filter((i) => i.id !== id)
}

function displayResolved(resolved: unknown): string {
  const labelFn = store.options?.resolvedLabel
  if (labelFn) return labelFn(resolved)
  if (typeof resolved === 'string') return resolved
  return JSON.stringify(resolved)
}

function onComplete() {
  if (completing) return
  completing = true
  stop()
  store.complete([...items.value])
}

function onMockScan() {
  if (!mockValue.value.trim() || completing) return
  addItem(mockValue.value.trim(), 'MOCK')
  mockValue.value = ''
}

onMounted(start)
onUnmounted(stop)
</script>

<style scoped>
.scanner-frame {
  position: absolute;
  width: 230px;
  height: 230px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
}
.corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border-color: #00e676;
  border-style: solid;
}
.corner.tl { top: 0;    left: 0;  border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.corner.tr { top: 0;    right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0; left: 0;  border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
.scanline {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 50%;
  height: 2px;
  background: linear-gradient(to right, transparent, #f44336, transparent);
  box-shadow: 0 0 6px #f44336;
}
</style>
