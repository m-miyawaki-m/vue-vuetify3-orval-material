import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'
import type { ScanModeOptions } from '@/types/scanMode'

export const useScanModeStore = defineStore('scanMode', () => {
  const options = ref<ScanModeOptions | null>(null)

  function requestScan(opts: ScanModeOptions) {
    options.value = opts
    router.push('/scan-mode')
  }

  function complete(raw: string, resolved?: unknown) {
    options.value?.onConfirm(raw, resolved)
    options.value = null
    router.back()
  }

  function cancel() {
    options.value = null
    router.back()
  }

  return { options, requestScan, complete, cancel }
})
