import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ScanModePage from '../ScanModePage.vue'
import { useScanModeStore } from '@/stores/scanModeStore'
import type { ScanResult } from '@/types/scanner'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

let capturedOnScan: ((result: ScanResult) => void) | null = null
let capturedFormatsGetter: (() => unknown) | null = null
const mockStop = vi.fn()
const mockStart = vi.fn()

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((videoRef, options) => {
    capturedOnScan = options.onScan
    capturedFormatsGetter = options.formats ?? null
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
  const store = useScanModeStore()
  store.requestScan({ onConfirm: vi.fn(), ...storeOpts })
  return mount(ScanModePage, {
    global: { stubs: { teleport: true } },
  })
}

describe('ScanModePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
    capturedFormatsGetter = null
  })

  it('マウント時に start() が呼ばれる', () => {
    mountPage()
    expect(mockStart).toHaveBeenCalled()
  })

  it('resolver なし: スキャン後 store.complete(raw, undefined) が呼ばれる', async () => {
    const onConfirm = vi.fn()
    mountPage({ onConfirm })
    const store = useScanModeStore()
    const completeSpy = vi.spyOn(store, 'complete')
    await capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(completeSpy).toHaveBeenCalledWith('4901234567890', undefined)
  })

  it('resolver あり: 成功時 store.complete(raw, resolved) が呼ばれる', async () => {
    const resolver = vi.fn().mockResolvedValue({ name: 'りんごジュース' })
    const onConfirm = vi.fn()
    mountPage({ resolver, onConfirm })
    const store = useScanModeStore()
    const completeSpy = vi.spyOn(store, 'complete')
    await capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(completeSpy).toHaveBeenCalledWith('4901234567890', { name: 'りんごジュース' })
  })

  it('barcode モードの formats getter は 1D バーコードフォーマットを返す', () => {
    mountPage({ defaultMode: 'barcode' })
    const fmts = capturedFormatsGetter?.() as unknown[]
    expect(fmts?.length).toBeGreaterThan(0)
  })

  it('qr モードの formats getter は QR_CODE のみを返す', async () => {
    const wrapper = mountPage({ defaultMode: 'qr' })
    // v-tabs で qr タブをクリック
    const tabs = wrapper.findAll('.v-tab')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    // formats getter は qr モード時に QR_CODE のみ
    // BarcodeFormat.QR_CODE = 11 (数値)
    const fmts = capturedFormatsGetter?.() as number[]
    expect(fmts?.length).toBe(1)
  })

  it('OCR タブ選択時に「準備中」テキストが表示される', async () => {
    const wrapper = mountPage()
    const tabs = wrapper.findAll('.v-tab')
    await tabs[2].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('準備中')
  })
})
