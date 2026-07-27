import { computed } from 'vue'
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

  function handleScan(r: ScanResult) {
    if (config.mode === 'single') {
      store.setSingleResult(toItem(r))
      router.push(config.resultPath)
    } else {
      store.addItem(toItem(r))
    }
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
    isContinuous: config.mode === 'continuous',
    title: config.title,
    fields: config.fields,
  }
}
