import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'
import type { ScanResult } from '@/types/scanner'

export const useScannerStore = defineStore('scanner', () => {
  const mode = ref<'single' | 'continuous'>('single')
  const title = ref<string | undefined>(undefined)
  // plain variable — functions shouldn't be reactive state
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
    _callback?.(results)
    _callback = null
    router.back()
  }

  function cancel() {
    _callback = null
    router.back()
  }

  return { mode, title, requestScan, complete, cancel }
})
