import type { ScanSet, ScanItem, ScanSetWithItems } from '@/types/quickScan'

// Room/SQLite 撤去に伴う保存層のメモリ実装。アプリ再起動で下書きは消える
const sets = new Map<string, ScanSetWithItems>()

/** テスト専用: 保持中のセットを全消去する */
export function __resetForTest(): void {
  sets.clear()
}

export async function createDraftSet(featureId: string): Promise<ScanSet> {
  const set: ScanSetWithItems = {
    id: crypto.randomUUID(),
    featureId,
    status: 'draft',
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    items: [],
  }
  sets.set(set.id, set)
  return structuredClone(set)
}

export async function addItem(
  setId: string,
  input: { seq: number; itemKey: string; value: string; format: string }
): Promise<ScanItem> {
  const set = sets.get(setId)
  if (!set) {
    throw new Error(`セットが見つかりません: ${setId}`)
  }
  const item: ScanItem = {
    id: crypto.randomUUID(),
    setId,
    ...input,
    scannedAt: new Date().toISOString(),
  }
  set.items.push(item)
  return structuredClone(item)
}

export async function deleteSet(setId: string): Promise<void> {
  sets.delete(setId)
}

export async function clearDrafts(featureId: string): Promise<void> {
  for (const [id, set] of sets) {
    if (set.featureId === featureId && set.status === 'draft') {
      sets.delete(id)
    }
  }
}

export async function confirmCompletedDrafts(
  featureId: string,
  requiredCount: number
): Promise<number> {
  let count = 0
  for (const set of sets.values()) {
    if (set.featureId === featureId && set.status === 'draft' && set.items.length >= requiredCount) {
      set.status = 'confirmed'
      set.confirmedAt = new Date().toISOString()
      count++
    }
  }
  return count
}

export async function findDraftSets(featureId: string): Promise<ScanSetWithItems[]> {
  return [...sets.values()]
    .filter((set) => set.featureId === featureId && set.status === 'draft')
    .map((set) => structuredClone(set))
}

export async function countDrafts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const set of sets.values()) {
    if (set.status === 'draft') {
      counts[set.featureId] = (counts[set.featureId] ?? 0) + 1
    }
  }
  return counts
}

export async function findLatestDraft(): Promise<ScanSetWithItems | null> {
  let latest: ScanSetWithItems | null = null
  // Map は挿入順を保持するため、最後に見つかった draft が最新
  for (const set of sets.values()) {
    if (set.status === 'draft') {
      latest = set
    }
  }
  return latest ? structuredClone(latest) : null
}
