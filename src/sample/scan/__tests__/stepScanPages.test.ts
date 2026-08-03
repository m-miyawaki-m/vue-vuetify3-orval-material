import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { ScanResult } from '@/types/scanner'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

let capturedOnScan: ((r: ScanResult) => void) | null = null
vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: vi.fn(),
      stop: vi.fn(),
      isScanning: ref(false),
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

import PairSingleScanPage from '../pages/PairSingleScanPage.vue'
import PairListScanPage from '../pages/PairListScanPage.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import { getStepPattern } from '../logic/stepPatterns'

const mountOpts = { global: { stubs: { teleport: true } } }
const steps = getStepPattern('pair-single').steps

describe('PairSingleScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('初期表示はステップ①の案内文で、1回読み取るとステップ②に切り替わる', async () => {
    const w = mount(PairSingleScanPage, mountOpts)
    expect(w.find('.step-guide').text()).toBe(steps[0].guide)
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    await w.vm.$nextTick()
    expect(w.find('.step-guide').text()).toBe(steps[1].guide)
    expect(w.text()).toContain('BAR-1')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('2回読み取ると組が保存され結果画面へ遷移する', async () => {
    mount(PairSingleScanPage, mountOpts)
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    capturedOnScan!({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    const store = useStepScanSessionStore()
    expect(store.firstSet?.parts.map((p) => p.raw)).toEqual(['BAR-1', 'QR-1'])
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-single/result')
  })

  it('1つ戻るは初期状態で disabled、1回読み取ると押せて parts が戻る', async () => {
    const w = mount(PairSingleScanPage, mountOpts)
    const backBtn = w.find('.step-back-btn')
    expect(backBtn.attributes('disabled')).toBeDefined()
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    await w.vm.$nextTick()
    expect(w.find('.step-back-btn').attributes('disabled')).toBeUndefined()
    await w.find('.step-back-btn').trigger('click')
    expect(useStepScanSessionStore().parts).toHaveLength(0)
  })

  it('種別メニュー(ScanTypeMenuButton)は表示されない', () => {
    const w = mount(PairSingleScanPage, mountOpts)
    expect(w.findComponent(ScanTypeMenuButton).exists()).toBe(false)
  })

  it('キャンセルでセッション破棄して戻る', async () => {
    const w = mount(PairSingleScanPage, mountOpts)
    const cancelBtn = w.findAll('button').find((b) => b.text().includes('キャンセル'))!
    await cancelBtn.trigger('click')
    expect(useStepScanSessionStore().hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('PairListScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('2回の読取で1組が蓄積され、組数が表示される(遷移しない)', async () => {
    const w = mount(PairListScanPage, mountOpts)
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    capturedOnScan!({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    await w.vm.$nextTick()
    expect(useStepScanSessionStore().setCount).toBe(1)
    expect(w.text()).toContain('読取済み: 1組')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('0組のとき読取完了は disabled、1組以上で結果画面へ遷移できる', async () => {
    const w = mount(PairListScanPage, mountOpts)
    const finishBtn = w.findAll('button').find((b) => b.text().includes('読取完了'))!
    expect(finishBtn.attributes('disabled')).toBeDefined()
    capturedOnScan!({ text: 'BAR-1', format: 'EAN_13', timestamp: 1 })
    capturedOnScan!({ text: 'QR-1', format: 'QR_CODE', timestamp: 2 })
    await w.vm.$nextTick()
    await w.findAll('button').find((b) => b.text().includes('読取完了'))!.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/pair-list/result')
  })

  it('手入力ダイアログの submit が現在ステップの値になる', async () => {
    const w = mount(PairListScanPage, mountOpts)
    await w.find('.manual-input-btn').trigger('click')
    const dialog = w.findComponent(ScanManualInputDialog)
    expect(dialog.props('modelValue')).toBe(true)
    dialog.vm.$emit('submit', 'ABC-123')
    await w.vm.$nextTick()
    const store = useStepScanSessionStore()
    expect(store.parts[0].raw).toBe('ABC-123')
    expect(store.parts[0].format).toBe('MANUAL')
  })
})
