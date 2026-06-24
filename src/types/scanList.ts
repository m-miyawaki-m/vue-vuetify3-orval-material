export interface ScanListItem {
  id: string
  raw: string
  format: string
  timestamp: number
  resolved?: unknown
  resolving: boolean
  resolveError?: string
}

export interface ScanListOptions {
  title?: string
  confirmLabel?: string
  resolver?: (text: string) => Promise<unknown>
  resolvedLabel?: (resolved: unknown) => string
  onConfirm: (items: ScanListItem[]) => void
}
