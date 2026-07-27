import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { ScanResult } from '@/types/scanner'

const mockStart = vi.fn()
const mockStop = vi.fn()
let capturedOnScan: ((r: ScanResult) => void) | null = null

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: mockStart,
      stop: mockStop,
      isScanning: ref(false),
      error: ref(null),
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

import ScanCameraView from '../components/ScanCameraView.vue'
import { OCR_DUMMY_TEXT } from '../logic/useScanEngine'

describe('ScanCameraView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('マウント時にカメラを起動する', () => {
    mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(mockStart).toHaveBeenCalled()
  })

  it('zxing の読取で scan を emit する', () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    capturedOnScan!({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(w.emitted('scan')?.[0]).toEqual([
      { text: '4901234567890', format: 'EAN_13', timestamp: 1 },
    ])
  })

  it('ocr のときシャッターボタンが表示され、押すとダミー文字列を emit する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'ocr' as const } })
    const shutter = w.find('.shutter-btn')
    expect(shutter.exists()).toBe(true)
    await shutter.trigger('click')
    const emitted = w.emitted('scan')?.[0]?.[0] as ScanResult
    expect(emitted.text).toBe(OCR_DUMMY_TEXT)
    expect(emitted.format).toBe('OCR')
  })

  it('barcode のときシャッターボタンは表示されない', () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(w.find('.shutter-btn').exists()).toBe(false)
  })

  it('種別変更でエンジンを再起動する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockStart.mockClear()
    await w.setProps({ scanType: 'qr' })
    expect(mockStop).toHaveBeenCalled()
    expect(mockStart).toHaveBeenCalled()
  })
})
