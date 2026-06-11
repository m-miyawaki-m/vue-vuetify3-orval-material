import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'
import type { ScanResult } from '@/types/scanner'

const SCAN_COOLDOWN_MS = 1500

interface ScannerControls {
  stop(error?: Error): void
  switchTorch?(on: boolean): Promise<void>
}

export function useBarcodeScanner(
  videoRef: Ref<HTMLVideoElement | null>,
  options: { onScan: (result: ScanResult) => void }
) {
  const isScanning = ref(false)
  const error = ref<string | null>(null)
  const torchAvailable = ref(false)
  let controls: ScannerControls | null = null
  let lastScanText = ''
  let lastScanTime = 0

  async function start() {
    if (!videoRef.value) return
    if (isScanning.value) stop()
    error.value = null
    try {
      const hints = new Map<DecodeHintType, unknown>()
      hints.set(DecodeHintType.TRY_HARDER, true)
      const reader = new BrowserMultiFormatReader(hints)
      controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.value,
        (result) => {
          if (!result) return
          const now = Date.now()
          const text = result.getText()
          if (text === lastScanText && now - lastScanTime < SCAN_COOLDOWN_MS) return
          lastScanText = text
          lastScanTime = now
          const fmtNum = result.getBarcodeFormat() as number
          const fmtName: string = BarcodeFormat[fmtNum] ?? String(fmtNum)
          options.onScan({ text, format: fmtName, timestamp: now })
        }
      ) as ScannerControls
      isScanning.value = true
      torchAvailable.value = typeof controls.switchTorch === 'function'
    } catch (e) {
      if (e instanceof Error) {
        error.value =
          e.name === 'NotAllowedError' ? 'カメラへのアクセスが拒否されました。設定から許可してください。' :
          e.name === 'NotFoundError'   ? 'カメラが見つかりません。' :
                                         'カメラの起動に失敗しました。'
      } else {
        error.value = 'カメラの起動に失敗しました。'
      }
    }
  }

  function stop() {
    controls?.stop()
    controls = null
    isScanning.value = false
  }

  async function switchTorch(on: boolean) {
    await controls?.switchTorch?.(on)
  }

  onUnmounted(stop)

  return { start, stop, isScanning, error, torchAvailable, switchTorch }
}
