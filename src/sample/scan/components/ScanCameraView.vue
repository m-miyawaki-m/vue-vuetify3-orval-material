<template>
  <div class="camera-wrap">
    <video ref="videoRef" class="camera-video" autoplay muted playsinline />
    <div class="camera-frame" />

    <v-btn
      v-if="torchAvailable && !isOcr"
      class="torch-btn"
      :icon="torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight'"
      size="small"
      @click="toggleTorch"
    />
    <v-btn
      v-if="isOcr"
      class="shutter-btn"
      icon="mdi-camera"
      size="large"
      color="primary"
      @click="captureOcr"
    />

    <v-alert v-if="error" class="camera-error" type="error" density="compact">
      {{ error }}
    </v-alert>

    <div v-if="isDev" class="dev-sim">
      <v-text-field
        v-model="simText"
        label="開発用: 疑似スキャン"
        density="compact"
        hide-details
        bg-color="surface"
        append-inner-icon="mdi-send"
        @click:append-inner="simulate"
        @keydown.enter="simulate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toRef, watch } from 'vue'
import type { ScanResult } from '@/types/scanner'
import type { ScanType } from '../types'
import { useScanEngine } from '../logic/useScanEngine'

const props = defineProps<{ scanType: ScanType }>()
const emit = defineEmits<{ scan: [result: ScanResult] }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const engine = useScanEngine(videoRef, toRef(props, 'scanType'), (r) => emit('scan', r))
const { error, torchAvailable, isOcr, captureOcr } = engine

onMounted(engine.start)
const torchOn = ref(false)
watch(() => props.scanType, () => {
  // 新しいストリームはトーチ OFF で始まるため、表示状態を実態に合わせてリセットする
  torchOn.value = false
  engine.restart()
})
async function toggleTorch() {
  torchOn.value = !torchOn.value
  await engine.switchTorch(torchOn.value)
}

// ブラウザ開発時にカメラなしで動作確認するための疑似入力
const isDev = import.meta.env.DEV
const simText = ref('')
function simulate() {
  if (!simText.value) return
  emit('scan', { text: simText.value, format: 'DEV', timestamp: Date.now() })
  simText.value = ''
}
</script>

<style scoped>
.camera-wrap {
  position: relative;
  height: 40vh;
  flex: none;
  background: #000;
}
.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.camera-frame {
  position: absolute;
  inset: 15% 10%;
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  pointer-events: none;
}
.torch-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}
.shutter-btn {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
}
.camera-error {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
}
.dev-sim {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 8px;
}
</style>
