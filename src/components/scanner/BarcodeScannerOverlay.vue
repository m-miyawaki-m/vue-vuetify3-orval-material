<template>
  <v-overlay
    v-model="model"
    :scrim="false"
    persistent
    class="align-start justify-start"
    style="z-index: 300;"
  >
    <div
      class="d-flex flex-column"
      style="width: 100vw; height: 100dvh; background: #000; overflow: hidden;"
    >
      <!-- ツールバー -->
      <div
        class="d-flex align-center px-3"
        style="height: 52px; background: rgba(0,0,0,0.75); flex-shrink: 0;"
      >
        <v-btn icon variant="text" color="white" size="small" @click="onCancel">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="flex-1-1 text-center text-white text-body-1 font-weight-bold">
          {{ title }}
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
        <!-- スキャン枠 -->
        <div class="scanner-frame" aria-hidden="true">
          <div class="corner tl" />
          <div class="corner tr" />
          <div class="corner bl" />
          <div class="corner br" />
          <div class="scanline" />
        </div>
        <!-- エラー表示 -->
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
      <template v-if="mode === 'continuous'">
        <div style="flex: 1; overflow-y: auto; background: #111;">
          <p class="text-caption text-medium-emphasis pa-2 pb-1">
            スキャン済み（{{ results.length }}件）
          </p>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="(item, i) in results"
              :key="i"
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
        <!-- アクションバー -->
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
  </v-overlay>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanResult } from '@/types/scanner'

const props = withDefaults(defineProps<{
  mode: 'single' | 'continuous'
  title?: string
}>(), {
  title: 'バーコード スキャン',
})

const emit = defineEmits<{
  scan: [result: ScanResult]
  complete: [results: ScanResult[]]
}>()

const model = defineModel<boolean>()
const videoRef = ref<HTMLVideoElement | null>(null)
const results = ref<ScanResult[]>([])
const torchOn = ref(false)

const { start, stop, error, torchAvailable, switchTorch } = useBarcodeScanner(videoRef, {
  onScan(result) {
    emit('scan', result)
    if (props.mode === 'continuous') {
      results.value.push(result)
    } else {
      // single: 読み取り完了 → 自動クローズ（stop は watch の else 節で呼ばれる）
      model.value = false
    }
  },
})

const cameraAreaStyle = computed(() => ({
  height: props.mode === 'continuous' ? '45%' : 'calc(100dvh - 52px)',
  flexShrink: '0',
}))

watch(model, async (open) => {
  if (open) {
    results.value = []
    torchOn.value = false
    await nextTick()
    await start()
  } else {
    stop()
  }
})

function onCancel() {
  model.value = false
}

function onComplete() {
  emit('complete', [...results.value])
  model.value = false
}

async function onToggleTorch() {
  torchOn.value = !torchOn.value
  await switchTorch(torchOn.value)
}
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
  height: 2px;
  background: linear-gradient(to right, transparent, #00e676, transparent);
  box-shadow: 0 0 6px #00e676;
  animation: scanline 1.8s ease-in-out infinite;
}

@keyframes scanline {
  0%, 100% { top: 14px; }
  50%       { top: calc(100% - 16px); }
}
</style>
