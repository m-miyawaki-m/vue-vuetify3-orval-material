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

import SingleRawScanPage from '../pages/SingleRawScanPage.vue'
import ListSplitScanPage from '../pages/ListSplitScanPage.vue'
import { useScanSessionStore } from '../stores/scanSessionStore'

const mountOpts = { global: { stubs: { teleport: true } } }

describe('SingleRawScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('スキャンすると store に保存され結果画面へ遷移する', async () => {
    mount(SingleRawScanPage, mountOpts)
    capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    const store = useScanSessionStore()
    expect(store.single?.raw).toBe('4901234567890')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('キャンセルでセッション破棄して戻る', async () => {
    const w = mount(SingleRawScanPage, mountOpts)
    const cancelBtn = w.findAll('button').find((b) => b.text().includes('キャンセル'))!
    await cancelBtn.trigger('click')
    expect(useScanSessionStore().hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('ListSplitScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('スキャンで分割済み item が蓄積され、件数が表示される', async () => {
    const w = mount(ListSplitScanPage, mountOpts)
    capturedOnScan!({ text: 'ITEM01,LOT-A,12', format: 'QR_CODE', timestamp: 1 })
    capturedOnScan!({ text: 'ITEM02,LOT-B,5', format: 'QR_CODE', timestamp: 2 })
    await w.vm.$nextTick()
    const store = useScanSessionStore()
    expect(store.count).toBe(2)
    expect(store.items[1].fields.productCode).toBe('ITEM02')
    expect(w.text()).toContain('読取済み: 2件')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('読取完了で結果画面へ遷移する', async () => {
    const w = mount(ListSplitScanPage, mountOpts)
    capturedOnScan!({ text: 'ITEM01,LOT-A,12', format: 'QR_CODE', timestamp: 1 })
    await w.vm.$nextTick()
    const finishBtn = w.findAll('button').find((b) => b.text().includes('読取完了'))!
    await finishBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/list-split/result')
  })

  it('0件のとき読取完了は disabled', () => {
    const w = mount(ListSplitScanPage, mountOpts)
    const finishBtn = w.findAll('button').find((b) => b.text().includes('読取完了'))!
    expect(finishBtn.attributes('disabled')).toBeDefined()
  })
})
