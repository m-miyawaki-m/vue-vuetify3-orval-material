import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { ScanResult } from '@/types/scanner'

const mockStart = vi.fn()
const mockStop = vi.fn()
let capturedOnScan: ((r: ScanResult) => void) | null = null
const mockError = ref<string | null>(null)

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: mockStart,
      stop: mockStop,
      isScanning: ref(false),
      error: mockError,
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))

import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { OCR_DUMMY_TEXT } from '../logic/useScanEngine'

describe('ScanCameraView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
    mockError.value = null
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

  it('error 発生時は×プレースホルダーを表示し video を隠す', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(w.find('.camera-fallback').exists()).toBe(false)
    mockError.value = 'カメラへのアクセスが拒否されました。設定から許可してください。'
    await w.vm.$nextTick()
    expect(w.find('.camera-fallback').exists()).toBe(true)
    expect(w.text()).toContain('カメラへのアクセスが拒否されました')
    expect(w.find('video').isVisible()).toBe(false)
    expect(w.find('.camera-frame').exists()).toBe(false)
  })

  it('error 発生で手入力ダイアログが自動表示される', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(w.findComponent(ScanManualInputDialog).props('modelValue')).toBe(false)
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    expect(w.findComponent(ScanManualInputDialog).props('modelValue')).toBe(true)
  })

  it('ダイアログの submit を format MANUAL の scan として emit する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    w.findComponent(ScanManualInputDialog).vm.$emit('submit', 'ITEM01,LOT-A,12')
    const emitted = w.emitted('scan')?.at(-1)?.[0] as ScanResult
    expect(emitted.text).toBe('ITEM01,LOT-A,12')
    expect(emitted.format).toBe('MANUAL')
  })

  it('閉じた後も「手入力する」ボタンで再表示できる', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    const dialog = w.findComponent(ScanManualInputDialog)
    dialog.vm.$emit('update:modelValue', false)
    await w.vm.$nextTick()
    expect(dialog.props('modelValue')).toBe(false)
    await w.find('.manual-btn').trigger('click')
    expect(dialog.props('modelValue')).toBe(true)
  })

  it('error 時は疑似スキャン入力(DEV)は残る', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    expect(w.find('.dev-sim').exists()).toBe(true)
  })
})
