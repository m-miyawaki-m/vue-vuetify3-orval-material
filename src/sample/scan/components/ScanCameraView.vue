<template>
  <div class="camera-wrap">
    <video v-show="!error" ref="videoRef" class="camera-video" autoplay muted playsinline />
    <div v-if="!error" class="camera-frame" />

    <v-btn
      v-if="torchAvailable && !isOcr && !error"
      class="torch-btn"
      :icon="torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight'"
      size="small"
      @click="toggleTorch"
    />
    <v-btn
      v-if="isOcr && !error"
      class="shutter-btn"
      icon="mdi-camera"
      size="large"
      color="primary"
      @click="captureOcr"
    />

    <!-- カメラ起動失敗時: ×プレースホルダー + 手入力導線 -->
    <div v-if="error" class="camera-fallback">
      <v-icon icon="mdi-camera-off" size="64" />
      <p class="text-body-2 px-4 text-center">{{ error }}</p>
      <v-btn class="manual-btn" color="primary" variant="tonal" @click="emit('manual-request')">
        手入力する
      </v-btn>
    </div>

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
const emit = defineEmits<{ scan: [result: ScanResult]; 'manual-request': [] }>()

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

// カメラ起動失敗時の手入力導線。失敗検知で親に手入力を要求し(=ページ側ダイアログの自動表示)、
// 閉じた後もプレースホルダーのボタンから再要求できる。ダイアログはページが所有する。
// エラーが再発するたび(タブ切替での再起動失敗を含む)自動で開き直すのは意図的
watch(error, (e) => {
  if (e) emit('manual-request')
})

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
.camera-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  /* 背景が固定黒のためテーマ非依存の明色にする */
  color: rgba(255, 255, 255, 0.7);
}
.dev-sim {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 8px;
}
</style>
