import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { ScanResult } from '@/types/scanner'
import type { ScanType } from '../types'

const mockStart = vi.fn()
const mockStop = vi.fn()
let capturedOptions: {
  onScan: (r: ScanResult) => void
  formats?: () => unknown[]
} | null = null

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOptions = options
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

import { useScanEngine, QR_FORMATS, BARCODE_FORMATS, OCR_DUMMY_TEXT } from '../logic/useScanEngine'

function setup(type: ScanType) {
  const scanType = ref<ScanType>(type)
  const onScan = vi.fn()
  const engine = useScanEngine(ref(null) as Ref<HTMLVideoElement | null>, scanType, onScan)
  return { scanType, onScan, engine }
}

describe('useScanEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOptions = null
  })

  it('qr のとき formats は QR_FORMATS を返す', () => {
    setup('qr')
    expect(capturedOptions!.formats!()).toEqual(QR_FORMATS)
  })

  it('barcode のとき formats は BARCODE_FORMATS を返す', () => {
    setup('barcode')
    expect(capturedOptions!.formats!()).toEqual(BARCODE_FORMATS)
  })

  it('zxing の読取は barcode/qr のとき通知され ocr のとき無視される', () => {
    const { scanType, onScan } = setup('barcode')
    capturedOptions!.onScan({ text: 'A', format: 'EAN_13', timestamp: 1 })
    expect(onScan).toHaveBeenCalledTimes(1)
    scanType.value = 'ocr'
    capturedOptions!.onScan({ text: 'B', format: 'EAN_13', timestamp: 2 })
    expect(onScan).toHaveBeenCalledTimes(1) // 増えない
  })

  it('captureOcr は ocr のときダミー文字列を format OCR で通知する', () => {
    const { onScan, engine } = setup('ocr')
    engine.captureOcr()
    expect(onScan).toHaveBeenCalledWith(
      expect.objectContaining({ text: OCR_DUMMY_TEXT, format: 'OCR' }),
    )
  })

  it('captureOcr は ocr 以外では何もしない', () => {
    const { onScan, engine } = setup('barcode')
    engine.captureOcr()
    expect(onScan).not.toHaveBeenCalled()
  })

  it('start/stop/restart は zxing scanner に委譲する', () => {
    const { engine } = setup('barcode')
    engine.start()
    expect(mockStart).toHaveBeenCalledTimes(1)
    engine.restart()
    expect(mockStop).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenCalledTimes(2)
  })
})
