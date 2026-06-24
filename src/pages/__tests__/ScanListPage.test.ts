import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanListPage from '../ScanListPage.vue'
import { useScanListStore } from '@/stores/scanListStore'
import type { ScanResult } from '@/types/scanner'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

let capturedOnScan: ((result: ScanResult) => void) | null = null
const mockStop = vi.fn()
const mockStart = vi.fn()

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: mockStart,
      stop: mockStop,
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

function mountPage(storeOpts = {}) {
  const store = useScanListStore()
  store.requestScanList({ onConfirm: vi.fn(), ...storeOpts })
  return mount(ScanListPage, {
    global: { stubs: { teleport: true } },
  })
}

describe('ScanListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('マウント時に start() が呼ばれる', () => {
    mountPage()
    expect(mockStart).toHaveBeenCalled()
  })

  it('スキャンするとリストにアイテムが追加される', async () => {
    const wrapper = mountPage()
    capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('4901234567890')
  })

  it('× ボタンでアイテムを削除できる', async () => {
    const wrapper = mountPage()
    capturedOnScan!({ text: 'item1', format: 'QR_CODE', timestamp: 1 })
    await wrapper.vm.$nextTick()
    // mdi-close ボタンをクリック（v-list-item の append スロット内の v-btn）
    const btns = wrapper.findAll('.v-btn')
    // クリアボタンと確定ボタンの2つ前がclose（DEV環境でも動作するよう後ろから3番目）
    const closeBtn2 = btns[btns.length - 3]
    await closeBtn2.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('item1')
  })

  it('確定ボタンで store.complete が呼ばれる', async () => {
    const onConfirm = vi.fn()
    const wrapper = mountPage({ onConfirm })
    capturedOnScan!({ text: 'abc', format: 'QR_CODE', timestamp: 1 })
    await wrapper.vm.$nextTick()
    const store = useScanListStore()
    const completeSpy = vi.spyOn(store, 'complete')
    // 確定ボタン（最後の v-btn）をクリック
    const btns = wrapper.findAll('.v-btn')
    await btns[btns.length - 1].trigger('click')
    expect(completeSpy).toHaveBeenCalled()
  })
})
