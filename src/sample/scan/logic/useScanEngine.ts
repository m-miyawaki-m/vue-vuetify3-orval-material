import { computed } from 'vue'
import type { Ref } from 'vue'
import { BarcodeFormat } from '@zxing/browser'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanResult } from '@/types/scanner'
import type { ScanType } from '../types'

export const QR_FORMATS: BarcodeFormat[] = [BarcodeFormat.QR_CODE]
export const BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
]

/** OCR スタブが返す固定文字列(split parser でそのまま分割できる形) */
export const OCR_DUMMY_TEXT = 'ITEM01,LOT-A,12'

/**
 * 読取エンジンの抽象化。
 * qr/barcode: zxing(既存 useBarcodeScanner)に委譲。
 * ocr: プレビューは zxing のカメラを流用しデコード結果は無視、
 *      captureOcr()(シャッター)がダミー文字列を返すスタブ。
 *      実案件では captureOcr の中身を Tesseract 等に差し替える。
 */
export function useScanEngine(
  videoRef: Ref<HTMLVideoElement | null>,
  scanType: Ref<ScanType>,
  onScan: (result: ScanResult) => void,
) {
  const scanner = useBarcodeScanner(videoRef, {
    onScan: (r) => {
      if (scanType.value === 'ocr') return
      onScan(r)
    },
    formats: () => (scanType.value === 'qr' ? QR_FORMATS : BARCODE_FORMATS),
  })

  const isOcr = computed(() => scanType.value === 'ocr')

  async function start() {
    await scanner.start()
  }
  function stop() {
    scanner.stop()
  }
  // formats は start 時に固定されるため、種別変更時は再起動が必要。
  // start() は非同期(カメラ起動待ち)のため、stop → start を直列化して
  // 前のセッションが解決する前に次の start が始まらないようにする。
  async function restart() {
    stop()
    await start()
  }
  function captureOcr() {
    if (!isOcr.value) return
    onScan({ text: OCR_DUMMY_TEXT, format: 'OCR', timestamp: Date.now() })
  }

  return {
    start, stop, restart, captureOcr, isOcr,
    isScanning: scanner.isScanning,
    error: scanner.error,
    torchAvailable: scanner.torchAvailable,
    switchTorch: scanner.switchTorch,
  }
}
