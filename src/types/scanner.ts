import type { BarcodeFormat } from '@zxing/browser'

export type { BarcodeFormat }

export interface ScanResult {
  text: string      // 読み取り結果文字列
  format: string    // BarcodeFormat 名（例: 'QR_CODE', 'EAN_13', 'CODE_128'）
  timestamp: number // Date.now()
}
