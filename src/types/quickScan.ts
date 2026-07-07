export type ScanSetStatus = 'draft' | 'confirmed'

/** scan_sets テーブルの1行（1セット = 1〜3個の読み取り値のまとまり） */
export interface ScanSet {
  id: string
  featureId: string
  status: ScanSetStatus
  createdAt: string // ISO 8601
  confirmedAt: string | null
}

/** scan_items テーブルの1行（セット内の1読み取り値） */
export interface ScanItem {
  id: string
  setId: string
  seq: number // 1〜3。ScanFeature.items の順序に対応
  itemKey: string
  value: string
  format: string // 'EAN_13' | 'QR_CODE' | 'MOCK' など
  scannedAt: string // ISO 8601
}

export interface ScanSetWithItems extends ScanSet {
  items: ScanItem[]
}
