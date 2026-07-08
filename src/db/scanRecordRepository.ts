import { Capacitor } from '@capacitor/core'
import { ScanRecord } from '@/plugins/scanRecord'
import type { ScanSet, ScanItem, ScanSetWithItems } from '@/types/quickScan'

function assertNative(): void {
  if (Capacitor.getPlatform() === 'web') {
    throw new Error('SQLite はブラウザでは利用できません。エミュレータまたは実機で確認してください')
  }
}

export async function createDraftSet(featureId: string): Promise<ScanSet> {
  assertNative()
  return ScanRecord.createDraftSet({ featureId })
}

export async function addItem(
  setId: string,
  input: { seq: number; itemKey: string; value: string; format: string }
): Promise<ScanItem> {
  assertNative()
  return ScanRecord.addItem({ setId, ...input })
}

export async function deleteSet(setId: string): Promise<void> {
  assertNative()
  await ScanRecord.deleteSet({ setId })
}

export async function clearDrafts(featureId: string): Promise<void> {
  assertNative()
  await ScanRecord.clearDrafts({ featureId })
}

export async function confirmCompletedDrafts(featureId: string, requiredCount: number): Promise<number> {
  assertNative()
  const { count } = await ScanRecord.confirmCompletedDrafts({ featureId, requiredCount })
  return count
}

export async function findDraftSets(featureId: string): Promise<ScanSetWithItems[]> {
  assertNative()
  const { sets } = await ScanRecord.findDraftSets({ featureId })
  return sets
}

export async function countDrafts(): Promise<Record<string, number>> {
  assertNative()
  const { counts } = await ScanRecord.countDrafts()
  return counts
}

export async function findLatestDraft(): Promise<ScanSetWithItems | null> {
  assertNative()
  const { set } = await ScanRecord.findLatestDraft()
  return set ?? null
}
