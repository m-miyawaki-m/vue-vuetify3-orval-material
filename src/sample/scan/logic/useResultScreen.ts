import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanPatternConfig } from './patterns'

/** 結果画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useResultScreen(config: ScanPatternConfig) {
  const router = useRouter()
  const store = useScanSessionStore()
  const { showSnack } = useSnackbar()

  // 直接アクセス(セッションなし・別パターン)はスキャン画面へ
  if (store.patternId !== config.id) {
    router.replace(config.scanPath)
  }

  const items = computed(() => store.items)
  const single = computed(() => store.single)

  function rescan() {
    if (config.mode === 'single') store.clearItems()
    router.back()
  }
  function confirm() {
    showSnack('success', `${store.count}件を確定しました`)
    store.reset()
    router.push('/sample/scan')
  }
  function removeItem(i: number) {
    store.removeItem(i)
  }
  function clearItems() {
    store.clearItems()
  }

  return {
    items, single, rescan, confirm, removeItem, clearItems,
    title: config.title,
    fields: config.fields,
  }
}
