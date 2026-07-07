export interface ScanFeatureItem {
  key: string
  label: string
}

export interface ScanFeature {
  id: string
  title: string
  icon: string
  color: string
  /** 読み取り順に並んだ項目定義（1〜3個） */
  items: ScanFeatureItem[]
}

export const scanFeatures: ScanFeature[] = [
  {
    id: 'inbound',
    title: '入荷',
    icon: 'mdi-package-down',
    color: 'primary',
    items: [
      { key: 'part_no', label: '品番' },
      { key: 'lot', label: 'ロット' },
      { key: 'qty', label: '数量' },
    ],
  },
  {
    id: 'outbound',
    title: '出荷',
    icon: 'mdi-package-up',
    color: 'success',
    items: [
      { key: 'part_no', label: '品番' },
      { key: 'lot', label: 'ロット' },
    ],
  },
  {
    id: 'inspection',
    title: '現品確認',
    icon: 'mdi-magnify-scan',
    color: 'warning',
    items: [{ key: 'part_no', label: '品番' }],
  },
]

export function findScanFeature(id: string): ScanFeature | undefined {
  return scanFeatures.find((f) => f.id === id)
}
