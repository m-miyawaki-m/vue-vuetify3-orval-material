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
          {{ store.title ?? 'バーコード スキャン' }}
        </span>
        <v-btn
          icon
          variant="text"
          :color="torchOn ? 'yellow-darken-1' : 'white'"
          size="small"
          :disabled="!torchAvailable"
          @click="onToggleTorch"
        >
          <v-icon>{{ torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight' }}</v-icon>
        </v-btn>
      </div>

      <!-- カメラエリア -->
      <div
        class="position-relative d-flex align-center justify-center"
        :style="cameraAreaStyle"
      >
        <video
          ref="videoRef"
          muted
          playsinline
          style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;"
        />
        <div class="scanner-frame" aria-hidden="true">
          <div class="corner tl" />
          <div class="corner tr" />
          <div class="corner bl" />
          <div class="corner br" />
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

      <!-- continuous モード: 履歴リスト -->
      <template v-if="store.mode === 'continuous'">
        <div style="flex: 1; overflow-y: auto; background: #111;">
          <p class="text-caption text-medium-emphasis pa-2 pb-1">
            スキャン済み（{{ results.length }}件）
          </p>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="(item, i) in results"
              :key="`${item.timestamp}-${item.text}`"
              :title="item.text"
              :subtitle="item.format"
            >
              <template #append>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="white"
                  @click="results.splice(i, 1)"
                >
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
        <div
          class="d-flex align-center gap-2 pa-2"
          style="background: rgba(0,0,0,0.85); flex-shrink: 0;"
        >
          <v-btn
            color="error"
            variant="text"
            size="small"
            prepend-icon="mdi-delete-outline"
            @click="results = []"
          >クリア</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            style="flex: 1;"
            @click="onComplete"
          >完了（{{ results.length }}件）</v-btn>
        </div>
      </template>

    </div>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useScannerStore } from '@/stores/scannerStore'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanResult } from '@/types/scanner'

const store = useScannerStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const results = ref<ScanResult[]>([])
const torchOn = ref(false)

const { start, stop, error, torchAvailable, switchTorch } = useBarcodeScanner(videoRef, {
  onScan(result) {
    if (store.mode === 'continuous') {
      results.value.push(result)
    } else {
      store.complete([result])
    }
  },
})

const cameraAreaStyle = computed(() => ({
  height: store.mode === 'continuous' ? '45%' : 'calc(100dvh - 52px)',
  flexShrink: '0',
}))

function onComplete() {
  store.complete([...results.value])
}

async function onToggleTorch() {
  torchOn.value = !torchOn.value
  await switchTorch(torchOn.value)
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
