import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

import { useStepScanScreen } from '../logic/useStepScanScreen'
import { getStepPattern } from '../logic/stepPatterns'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'

describe('useStepScanScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('初期状態はステップ0で currentStep は1つ目の定義を返す', () => {
    const { currentStep, currentStepIndex, canStepBack } = useStepScanScreen(
      getStepPattern('pair-single'),
    )
    expect(currentStepIndex.value).toBe(0)
    expect(currentStep.value.accept).toBe('barcode')
    expect(canStepBack.value).toBe(false)
  })

  it('1回目の読取でステップ2へ進み currentStep が切り替わる', () => {
    const { handleScan, currentStep, currentStepIndex, canStepBack } = useStepScanScreen(
      getStepPattern('pair-single'),
    )
    handleScan({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(currentStepIndex.value).toBe(1)
    expect(currentStep.value.accept).toBe('qr-or-barcode')
    expect(canStepBack.value).toBe(true)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('single: 2回目の読取で組が完成し結果画面へ遷移する', () => {
    const { handleScan } = useStepScanScreen(getStepPattern('pair-single'))
    handleScan({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    handleScan({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    const store = useStepScanSessionStore()
    expect(store.setCount).toBe(1)
    expect(store.firstSet?.parts.map((p) => p.raw)).toEqual(['BAR-1', 'QR-1'])
    expect(store.currentStepIndex).toBe(0)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-single/result')
  })

  it('continuous: 組完成でリストに蓄積されステップ①へ戻る(遷移しない)', () => {
    const { handleScan, currentStepIndex, setCount } = useStepScanScreen(
      getStepPattern('pair-list'),
    )
    handleScan({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    handleScan({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    handleScan({ text: 'BAR-2', format: 'EAN_13', timestamp: 3 })
    handleScan({ text: 'QR-2', format: 'CODE_128', timestamp: 4 })
    expect(setCount.value).toBe(2)
    expect(currentStepIndex.value).toBe(0)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('stepBack で直前ステップをやり直せる', () => {
    const { handleScan, stepBack, currentStepIndex, parts } = useStepScanScreen(
      getStepPattern('pair-list'),
    )
    handleScan({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    stepBack()
    expect(currentStepIndex.value).toBe(0)
    expect(parts.value).toHaveLength(0)
  })

  it('同一パターンのセッションが残っていれば継続する(sets 保持)', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    store.completeSet()
    useStepScanScreen(getStepPattern('pair-list'))
    expect(store.setCount).toBe(1)
  })

  it('別パターンのセッションが残っていれば新規開始する', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    store.addPart({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    useStepScanScreen(getStepPattern('pair-single'))
    expect(store.patternId).toBe('pair-single')
    expect(store.parts).toHaveLength(0)
  })

  it('手入力は MANUAL として現在ステップの値になる', () => {
    const { handleManualSubmit, manualOpen, openManual } = useStepScanScreen(
      getStepPattern('pair-list'),
    )
    expect(manualOpen.value).toBe(false)
    openManual()
    expect(manualOpen.value).toBe(true)
    handleManualSubmit('ABC-123')
    const store = useStepScanSessionStore()
    expect(store.parts[0].raw).toBe('ABC-123')
    expect(store.parts[0].format).toBe('MANUAL')
  })

  it('finish で結果画面へ、cancel でセッション破棄して戻る', () => {
    const { finish, cancel } = useStepScanScreen(getStepPattern('pair-list'))
    finish()
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-list/result')
    cancel()
    expect(useStepScanSessionStore().hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })
})
