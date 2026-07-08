import { registerPlugin } from '@capacitor/core'
import type { ScanSet, ScanItem, ScanSetWithItems } from '@/types/quickScan'

export interface ScanRecordPlugin {
  createDraftSet(options: { featureId: string }): Promise<ScanSet>
  addItem(options: {
    setId: string
    seq: number
    itemKey: string
    value: string
    format: string
  }): Promise<ScanItem>
  deleteSet(options: { setId: string }): Promise<void>
  clearDrafts(options: { featureId: string }): Promise<void>
  confirmCompletedDrafts(options: {
    featureId: string
    requiredCount: number
  }): Promise<{ count: number }>
  findDraftSets(options: { featureId: string }): Promise<{ sets: ScanSetWithItems[] }>
  countDrafts(): Promise<{ counts: Record<string, number> }>
  findLatestDraft(): Promise<{ set: ScanSetWithItems | null }>
}

// ネイティブ実装のみ（ScanRecordPlugin.kt）。ブラウザでは repository 入口でエラーにする
export const ScanRecord = registerPlugin<ScanRecordPlugin>('ScanRecord')
