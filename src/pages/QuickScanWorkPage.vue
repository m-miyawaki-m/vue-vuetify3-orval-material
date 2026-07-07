<template>
  <v-layout>
    <div class="d-flex flex-column" style="width: 100%; height: 100dvh; background: #000; overflow: hidden;">

      <!-- ツールバー -->
      <div
        class="d-flex align-center px-3"
        style="height: 52px; background: rgba(0,0,0,0.75); flex-shrink: 0;"
      >
        <!-- 戻る先は常に機能選択画面。作業再開ボタン経由（ホーム→本画面）でも
             /quick-scan に戻れるよう、履歴 back ではなく明示遷移にする -->
        <v-btn
          icon
          variant="text"
          color="white"
          size="small"
          data-testid="back-btn"
          @click="router.replace('/quick-scan')"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="flex-1-1 text-center text-white text-body-1 font-weight-bold">
          {{ feature.title }}スキャン
        </span>
        <div style="width: 36px;" />
      </div>

      <!-- DB エラーバナー -->
      <v-alert v-if="dbError" type="error" density="compact" rounded="0" style="flex-shrink: 0;">
        {{ dbError }}
      </v-alert>

      <!-- カメラエリア -->
      <div
        class="position-relative d-flex align-center justify-center"
        style="height: 38%; flex-shrink: 0;"
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

      <!-- 現在のセット進行ガイド -->
      <div class="px-3 py-2" style="background: #1a1a1a; flex-shrink: 0;">
        <p class="text-caption text-medium-emphasis mb-1">現在のセット</p>
        <div
          v-for="(item, i) in feature.items"
          :key="item.key"
          class="d-flex align-center text-body-2"
          style="min-height: 26px;"
        >
          <template v-if="i < progress.entries.value.length">
            <v-icon color="success" size="18" class="mr-2">mdi-check-circle</v-icon>
            <span class="text-white">{{ item.label }}: {{ progress.entries.value[i].value }}</span>
          </template>
          <template v-else-if="i === progress.entries.value.length">
            <v-icon color="warning" size="18" class="mr-2">mdi-timer-sand</v-icon>
            <span class="text-warning">次は「{{ item.label }}」を読み取ってください</span>
          </template>
          <template v-else>
            <v-icon color="grey" size="18" class="mr-2">mdi-circle-outline</v-icon>
            <span class="text-medium-emphasis">{{ item.label }}</span>
          </template>
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

      <!-- 読み取り済み（完成した draft セット） -->
      <div style="flex: 1; overflow-y: auto; background: #111;">
        <p class="text-caption text-medium-emphasis pa-2 pb-1">
          読み取り済み（{{ completedSets.length }}件）
        </p>
        <v-list density="compact" bg-color="transparent">
          <v-list-item v-for="set in completedSets" :key="set.id">
            <template #title>
              <span class="text-white text-body-2">{{ setTitle(set) }}</span>
            </template>
            <template #subtitle>
              <span class="text-medium-emphasis text-caption">{{ setSubtitle(set) }}</span>
            </template>
            <template #append>
              <v-btn icon size="x-small" variant="text" color="white" @click="onDeleteSet(set.id)">
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
          :disabled="completedSets.length === 0 && progress.entries.value.length === 0"
          @click="clearDialog = true"
        >クリア</v-btn>
        <v-btn
          data-testid="confirm-btn"
          color="primary"
          variant="elevated"
          style="flex: 1;"
          :disabled="completedSets.length === 0 || !!dbError"
          @click="onConfirm"
        >
          確定（{{ completedSets.length }}件）
        </v-btn>
      </div>

      <!-- クリア確認ダイアログ -->
      <v-dialog v-model="clearDialog" max-width="320">
        <v-card>
          <v-card-title class="text-body-1">未確定データを削除しますか？</v-card-title>
          <v-card-text class="text-body-2">
            読み取り途中のセットを含む未確定 {{ completedSets.length + (progress.entries.value.length > 0 ? 1 : 0) }} 件を削除します。
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="clearDialog = false">キャンセル</v-btn>
            <v-btn color="error" variant="flat" @click="onClear">削除</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="snackbar" timeout="2500">{{ snackbarText }}</v-snackbar>

    </div>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import router from '@/router'
import { findScanFeature } from '@/constants/scanFeatures'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import { useScanSetProgress } from '@/composables/useScanSetProgress'
import {
  createDraftSet,
  addItem,
  deleteSet,
  clearDrafts,
  confirmCompletedDrafts,
  findDraftSets,
} from '@/db/scanRecordRepository'
import type { ScanSetWithItems } from '@/types/quickScan'

const props = defineProps<{ featureId: string }>()

const isDev = import.meta.env.DEV
const resolved = findScanFeature(props.featureId)
if (!resolved) router.replace('/quick-scan')
// 未知の featureId は上で /quick-scan に戻すため、以降は先頭機能で埋めても表示されない
const feature = resolved ?? findScanFeature('inbound')!

const videoRef = ref<HTMLVideoElement | null>(null)
const completedSets = ref<ScanSetWithItems[]>([])
const dbError = ref<string | null>(null)
const clearDialog = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const mockValue = ref('')
const progress = useScanSetProgress(feature)
let currentSetId: string | null = null
let writing = false

const { start, stop, error } = useBarcodeScanner(videoRef, {
  onScan(result) {
    handleValue(result.text, result.format)
  },
})

async function reload() {
  const drafts = await findDraftSets(feature.id)
  completedSets.value = drafts
    .filter((s) => s.items.length >= feature.items.length)
    .reverse() // 新しい順に表示
  const partial = drafts.find((s) => s.items.length < feature.items.length)
  currentSetId = partial?.id ?? null
  if (partial) progress.restore(partial.items)
  else progress.reset()
}

async function handleValue(value: string, format: string) {
  if (writing || dbError.value) return
  const next = progress.nextItem.value
  if (!next) return
  writing = true
  try {
    if (!currentSetId) {
      currentSetId = (await createDraftSet(feature.id)).id
    }
    await addItem(currentSetId, {
      seq: progress.entries.value.length + 1,
      itemKey: next.key,
      value,
      format,
    })
    progress.add(value, format)
    if (progress.isComplete.value) await reload()
  } catch {
    notify('保存に失敗しました')
  } finally {
    writing = false
  }
}

async function onDeleteSet(setId: string) {
  try {
    await deleteSet(setId)
    await reload()
  } catch {
    notify('削除に失敗しました')
  }
}

async function onClear() {
  clearDialog.value = false
  try {
    await clearDrafts(feature.id)
    await reload()
  } catch {
    notify('削除に失敗しました')
  }
}

async function onConfirm() {
  try {
    const n = await confirmCompletedDrafts(feature.id, feature.items.length)
    notify(`${n}件確定しました`)
    await reload()
  } catch {
    notify('確定に失敗しました')
  }
}

function onMockScan() {
  if (!mockValue.value.trim()) return
  handleValue(mockValue.value.trim(), 'MOCK')
  mockValue.value = ''
}

function setTitle(set: ScanSetWithItems): string {
  return set.items.map((i) => i.value).join(' / ')
}

function setSubtitle(set: ScanSetWithItems): string {
  const time = new Date(set.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return `${feature.items.map((i) => i.label).join('/')} · ${time}`
}

function notify(text: string) {
  snackbarText.value = text
  snackbar.value = true
}

onMounted(async () => {
  if (!resolved) return // 未知の featureId はリダイレクト中。副作用を起こさない
  try {
    await reload()
  } catch {
    dbError.value = 'データベースの初期化に失敗しました。スキャン結果は保存されません。'
  }
  start()
})
onUnmounted(stop)
</script>

<style scoped>
.scanner-frame {
  position: absolute;
  width: 200px;
  height: 200px;
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
