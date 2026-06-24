import { defineStore } from 'pinia'
import { ref } from 'vue'
import router from '@/router'
import type { ScanListItem, ScanListOptions } from '@/types/scanList'

export const useScanListStore = defineStore('scanList', () => {
  const options = ref<ScanListOptions | null>(null)

  function requestScanList(opts: ScanListOptions) {
    options.value = opts
    router.push('/scan-list')
  }

  function complete(items: ScanListItem[]) {
    options.value?.onConfirm(items)
    options.value = null
    router.back()
  }

  function cancel() {
    options.value = null
    router.back()
  }

  return { options, requestScanList, complete, cancel }
})
