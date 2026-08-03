import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSnackbar } from '@/composables/useSnackbar'
import type { ScanResult } from '@/types/scanner'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { StepScanPatternConfig } from './stepPatterns'

/** ステップ式スキャン画面の結線ロジック。ページ vue はこれをバインドするだけ */
export function useStepScanScreen(config: StepScanPatternConfig) {
  const router = useRouter()
  const store = useStepScanSessionStore()
  const { showSnack } = useSnackbar()

  // 結果画面から「再スキャン」で戻った同一パターンはセッション継続、それ以外は新規開始
  if (store.patternId !== config.id) {
    store.startSession(config.id, config.mode)
  }

  const currentStepIndex = computed(() => store.currentStepIndex)
  // 組完成の瞬間(parts が満杯)でも範囲外参照しないようクランプする
  const currentStep = computed(
    () => config.steps[Math.min(store.currentStepIndex, config.steps.length - 1)],
  )
  const parts = computed(() => store.parts)
  const setCount = computed(() => store.setCount)
  const canStepBack = computed(() => store.parts.length > 0)

  function handleScan(r: ScanResult) {
    store.addPart({ raw: r.text, format: r.format, timestamp: r.timestamp, fields: {} })
    if (store.parts.length < config.steps.length) return
    store.completeSet()
    if (config.mode === 'single') {
      router.push(config.resultPath)
    } else {
      showSnack('success', `1組を追加しました(計${store.setCount}組)`)
    }
  }

  function stepBack() {
    store.stepBack()
  }

  // フッター常設の手入力。submit は MANUAL として現在ステップの値に流す
  const manualOpen = ref(false)
  function openManual() {
    manualOpen.value = true
  }
  function handleManualSubmit(text: string) {
    handleScan({ text, format: 'MANUAL', timestamp: Date.now() })
  }

  function finish() {
    router.push(config.resultPath)
  }
  function cancel() {
    store.reset()
    router.back()
  }

  return {
    steps: config.steps,
    currentStep, currentStepIndex, parts, setCount, canStepBack,
    handleScan, stepBack,
    manualOpen, openManual, handleManualSubmit,
    finish, cancel,
    isContinuous: config.mode === 'continuous',
    title: config.title,
  }
}
