import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { StepScanPatternConfig } from './stepPatterns'

/** ステップ式結果画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useStepResultScreen(config: StepScanPatternConfig) {
  const router = useRouter()
  const store = useStepScanSessionStore()
  const { showSnack } = useSnackbar()

  // 直接アクセス(セッションなし・別パターン)はスキャン画面へ
  if (store.patternId !== config.id) {
    router.replace(config.scanPath)
  }

  const sets = computed(() => store.sets)
  const firstSet = computed(() => store.firstSet)

  function rescan() {
    if (config.mode === 'single') store.clearSets()
    router.back()
  }
  function confirm() {
    showSnack('success', `${store.setCount}組を確定しました`)
    store.reset()
    router.push('/sample/scan')
  }
  function removeSet(i: number) {
    store.removeSet(i)
  }

  return {
    sets, firstSet, rescan, confirm, removeSet,
    title: config.title,
    steps: config.steps,
  }
}
