import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ScannerSessionState {
  barcodes: string[]
  memo: string
}

export type WorkSessionType = 'scanner'

export interface WorkSession {
  id: string
  type: WorkSessionType
  title: string
  route: string
  startedAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  state: ScannerSessionState
}

export const useWorkSessionStore = defineStore('workSession', () => {
  const currentSession = ref<WorkSession | null>(null)

  const hasActiveSession = computed(() => currentSession.value !== null)

  const sessionLabel = computed(() => {
    if (!currentSession.value) return '作業なし'
    return `${currentSession.value.title}を再開`
  })

  const sessionSubLabel = computed(() => {
    if (!currentSession.value) return ''
    const s = currentSession.value.state as ScannerSessionState
    const count = s.barcodes.length
    const time = new Date(currentSession.value.startedAt)
      .toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    return `${count}件 · ${time} 開始`
  })

  function startScannerSession() {
    currentSession.value = {
      id: Date.now().toString(36),
      type: 'scanner',
      title: 'スキャナー作業',
      route: '/scanner',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: { barcodes: [], memo: '' },
    }
  }

  function updateBarcodes(barcodes: string[]) {
    if (!currentSession.value) return
    const s = currentSession.value.state as ScannerSessionState
    currentSession.value.state = { ...s, barcodes }
    currentSession.value.updatedAt = new Date().toISOString()
  }

  function updateMemo(memo: string) {
    if (!currentSession.value) return
    const s = currentSession.value.state as ScannerSessionState
    currentSession.value.state = { ...s, memo }
    currentSession.value.updatedAt = new Date().toISOString()
  }

  function clearSession() {
    currentSession.value = null
  }

  return {
    currentSession,
    hasActiveSession,
    sessionLabel,
    sessionSubLabel,
    startScannerSession,
    updateBarcodes,
    updateMemo,
    clearSession,
  }
}, { persist: true })
