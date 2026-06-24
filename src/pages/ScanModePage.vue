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
          {{ store.options?.title ?? 'バーコード読み取り' }}
        </span>
        <v-btn
          icon
          variant="text"
          :color="torchOn ? 'yellow-darken-1' : 'white'"
          size="small"
          :disabled="!torchAvailable || scanMode === 'ocr'"
          @click="onToggleTorch"
        >
          <v-icon>{{ torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight' }}</v-icon>
        </v-btn>
      </div>

      <!-- モードタブ -->
      <v-tabs
        v-model="scanMode"
        bg-color="rgba(0,0,0,0.75)"
        color="primary"
        density="compact"
        style="flex-shrink: 0;"
      >
        <v-tab value="barcode">バーコード</v-tab>
        <v-tab value="qr">QR</v-tab>
        <v-tab value="ocr">OCR</v-tab>
      </v-tabs>

      <!-- カメラ / OCR プレースホルダー -->
      <div class="position-relative d-flex align-center justify-center" style="flex: 1;">

        <template v-if="scanMode === 'ocr'">
          <div class="d-flex flex-column align-center justify-center" style="color: white;">
            <v-icon size="64" color="grey-darken-1">mdi-text-recognition</v-icon>
            <p class="mt-4 text-body-2 text-medium-emphasis">OCR 機能は準備中です</p>
          </div>
        </template>

        <template v-else>
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
          <div
            v-if="resolving"
            class="d-flex flex-column align-center justify-center"
            style="position: absolute; inset: 0; background: rgba(0,0,0,0.8); z-index: 3;"
          >
            <v-progress-circular indeterminate color="primary" size="48" />
            <p class="text-white mt-4 text-body-2">解決中...</p>
          </div>
        </template>
      </div>

      <!-- DEV モック入力 -->
      <div
        v-if="isDev && scanMode !== 'ocr'"
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

    </div>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { BarcodeFormat } from '@zxing/browser'
import { useScanModeStore } from '@/stores/scanModeStore'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import { useSnackbar } from '@/composables/useSnackbar'
import type { ScanMode } from '@/types/scanMode'
import type { ScanResult } from '@/types/scanner'

const isDev = import.meta.env.DEV
const store = useScanModeStore()
const { showSnack } = useSnackbar()
const videoRef = ref<HTMLVideoElement | null>(null)
const scanMode = ref<ScanMode>(store.options?.defaultMode ?? 'barcode')
const torchOn = ref(false)
const resolving = ref(false)
const mockValue = ref('')
let completing = false

const MODE_FORMATS: Record<Exclude<ScanMode, 'ocr'>, BarcodeFormat[]> = {
  barcode: [
    BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_39,
  ],
  qr: [BarcodeFormat.QR_CODE],
}

const { start, stop, error, torchAvailable, switchTorch } = useBarcodeScanner(videoRef, {
  onScan: handleScan,
  formats: () => scanMode.value !== 'ocr' ? MODE_FORMATS[scanMode.value] : [],
})

async function handleScan(result: ScanResult) {
  if (completing) return
  completing = true
  stop()

  const resolver = store.options?.resolver
  if (!resolver) {
    store.complete(result.text, undefined)
    return
  }

  resolving.value = true
  try {
    const resolved = await resolver(result.text)
    store.complete(result.text, resolved)
  } catch (e) {
    resolving.value = false
    completing = false
    showSnack('error', e instanceof Error ? e.message : '取得に失敗しました')
    start()
  }
}

async function onMockScan() {
  if (!mockValue.value.trim() || completing) return
  const text = mockValue.value.trim()
  mockValue.value = ''
  await handleScan({ text, format: 'MOCK', timestamp: Date.now() })
}

async function onToggleTorch() {
  torchOn.value = !torchOn.value
  await switchTorch(torchOn.value)
}

watch(scanMode, async () => {
  stop()
  torchOn.value = false
  if (scanMode.value !== 'ocr') {
    await nextTick()
    start()
  }
})

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
