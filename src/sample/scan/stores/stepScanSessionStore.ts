import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ScanItem, ScanSessionMode, ScanSetItem } from '../types'

/**
 * ステップ式スキャン画面⇄結果画面の画面またぎ専用 store。
 * シリアライズ可能なデータのみ保持する(コールバック・関数は入れない)。
 */
export const useStepScanSessionStore = defineStore('sampleStepScanSession', () => {
  const patternId = ref<string | null>(null)
  const mode = ref<ScanSessionMode>('single')
  /** 進行中の組(読取済みステップの値) */
  const parts = ref<ScanItem[]>([])
  /** 完成した組 */
  const sets = ref<ScanSetItem[]>([])

  const hasSession = computed(() => patternId.value !== null)
  // 現在のステップ位置は「読取済み parts 数」と常に一致するため導出値にする
  const currentStepIndex = computed(() => parts.value.length)
  const setCount = computed(() => sets.value.length)
  const firstSet = computed(() => sets.value[0] ?? null)

  function startSession(id: string, m: ScanSessionMode) {
    patternId.value = id
    mode.value = m
    parts.value = []
    sets.value = []
  }
  function addPart(item: ScanItem) {
    parts.value = [...parts.value, item]
  }
  function completeSet() {
    sets.value = [...sets.value, { parts: parts.value }]
    parts.value = []
  }
  function stepBack() {
    parts.value = parts.value.slice(0, -1)
  }
  function removeSet(index: number) {
    sets.value = sets.value.filter((_, i) => i !== index)
  }
  function clearSets() {
    sets.value = []
    parts.value = []
  }
  function reset() {
    patternId.value = null
    parts.value = []
    sets.value = []
  }

  return {
    patternId, mode, parts, sets,
    hasSession, currentStepIndex, setCount, firstSet,
    startSession, addPart, completeSet, stepBack, removeSet, clearSets, reset,
  }
})
