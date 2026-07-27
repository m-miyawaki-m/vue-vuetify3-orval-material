export type ScanType = 'qr' | 'barcode' | 'ocr'
export type ScanSessionMode = 'single' | 'continuous'

/** 分割表示・フォーム項目の定義(ラベル+格納キー) */
export interface ScanFieldDef {
  key: string
  label: string
}

/** 読取1件分。store に入れるためシリアライズ可能な値のみ */
export interface ScanItem {
  raw: string
  format: string
  timestamp: number
  /** parser の分割結果。passthrough の場合は空オブジェクト */
  fields: Record<string, string>
}
