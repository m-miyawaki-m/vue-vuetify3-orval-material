import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ScanItem, ScanSessionMode, ScanType } from '../types'

/**
 * スキャン画面⇄結果画面の画面またぎ専用 store。
 * シリアライズ可能なデータのみ保持する(コールバック・関数は入れない)。
 */
export const useScanSessionStore = defineStore('sampleScanSession', () => {
  const patternId = ref<string | null>(null)
  const mode = ref<ScanSessionMode>('single')
  const scanType = ref<ScanType>('barcode')
  const items = ref<ScanItem[]>([])

  const hasSession = computed(() => patternId.value !== null)
  const count = computed(() => items.value.length)
  const latest = computed(() => items.value[items.value.length - 1] ?? null)
  const single = computed(() => items.value[0] ?? null)

  function startSession(id: string, m: ScanSessionMode) {
    // scanType は意図的にリセットしない: ユーザーの直前の読取種別を
    // 好みとして次のセッションにも引き継ぐ(バーコード続きの利用が多い想定)。
    patternId.value = id
    mode.value = m
    items.value = []
  }
  function setScanType(t: ScanType) {
    scanType.value = t
  }
  function setSingleResult(item: ScanItem) {
    items.value = [item]
  }
  function addItem(item: ScanItem) {
    items.value = [...items.value, item]
  }
  function removeItem(index: number) {
    items.value = items.value.filter((_, i) => i !== index)
  }
  function clearItems() {
    items.value = []
  }
  function reset() {
    patternId.value = null
    items.value = []
  }

  return {
    patternId, mode, scanType, items,
    hasSession, count, latest, single,
    startSession, setScanType, setSingleResult, addItem, removeItem, clearItems, reset,
  }
})
