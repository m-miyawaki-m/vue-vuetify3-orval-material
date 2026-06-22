import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'
import type { ScanResult } from '@/types/scanner'

export const useScannerStore = defineStore('scanner', () => {
  const mode = ref<'single' | 'continuous'>('single')
  const title = ref<string | undefined>(undefined)
  const pendingResult = ref<ScanResult | null>(null)
  let _callback: ((results: ScanResult[]) => void) | null = null

  function requestScan(
    m: 'single' | 'continuous',
    cb: (results: ScanResult[]) => void,
    t?: string,
  ) {
    mode.value = m
    title.value = t
    _callback = cb
    router.push('/scanner')
  }

  function complete(results: ScanResult[]) {
    if (mode.value === 'single' && results.length > 0) {
      pendingResult.value = results[0]
    }
    _callback?.(results)
    _callback = null
    router.back()
  }

  function consumePendingResult(): ScanResult | null {
    const r = pendingResult.value
    pendingResult.value = null
    return r
  }

  function cancel() {
    _callback = null
    router.back()
  }

  return { mode, title, pendingResult, requestScan, complete, consumePendingResult, cancel }
})
