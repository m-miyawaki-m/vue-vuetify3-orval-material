import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ScanResult } from '@/types/scanner'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanItem } from '../types'
import type { ScanPatternConfig } from './patterns'

/** スキャン画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useScanScreen(config: ScanPatternConfig) {
  const router = useRouter()
  const store = useScanSessionStore()

  // 結果画面から「再スキャン」で戻った同一パターンはセッション継続、それ以外は新規開始
  if (store.patternId !== config.id) {
    store.startSession(config.id, config.mode)
  }

  const scanType = computed({
    get: () => store.scanType,
    set: (t) => store.setScanType(t),
  })
  const count = computed(() => store.count)
  const latest = computed(() => store.latest)

  function toItem(r: ScanResult): ScanItem {
    return { raw: r.text, format: r.format, timestamp: r.timestamp, fields: config.parser(r.text) }
  }

  // OCR は誤読前提のため、連続モードでは確認ダイアログを挟んでから積む
  const pendingOcrItem = ref<ScanItem | null>(null)

  function handleScan(r: ScanResult) {
    const item = toItem(r)
    if (config.mode === 'continuous' && r.format === 'OCR') {
      pendingOcrItem.value = item
      return
    }
    if (config.mode === 'single') {
      store.setSingleResult(item)
      router.push(config.resultPath)
    } else {
      store.addItem(item)
    }
  }

  function confirmOcr(item: ScanItem) {
    store.addItem(item)
    pendingOcrItem.value = null
  }
  function discardOcr() {
    pendingOcrItem.value = null
  }

  function finish() {
    router.push(config.resultPath)
  }
  function cancel() {
    store.reset()
    router.back()
  }

  return {
    scanType, count, latest, handleScan, finish, cancel,
    pendingOcrItem, confirmOcr, discardOcr,
    isContinuous: config.mode === 'continuous',
    title: config.title,
    fields: config.fields,
    parser: config.parser,
  }
}
