export type ScanMode = 'barcode' | 'qr' | 'ocr'

export interface ScanModeOptions {
  title?: string
  defaultMode?: ScanMode
  resolver?: (text: string) => Promise<unknown>
  onConfirm: (raw: string, resolved?: unknown) => void
}
