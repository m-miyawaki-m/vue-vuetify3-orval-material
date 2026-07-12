import type { ScanSet, ScanItem, ScanSetWithItems } from '@/types/quickScan'

// 保存層のメモリ実装。アプリ再起動で下書きは消える
const sets = new Map<string, ScanSetWithItems>()

// findLatestDraft 用: セットの「最後に作成またはスキャンした」順序を厳密に管理する側map。
// タイムスタンプ文字列の同値（ミリ秒精度の衝突）に左右されないよう、単調増加カウンタで管理する。
const touched = new Map<string, number>()
let touchCounter = 0

/** テスト専用: 保持中のセットを全消去する */
export function __resetForTest(): void {
  sets.clear()
  touched.clear()
  touchCounter = 0
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
  touched.set(set.id, ++touchCounter)
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
  touched.set(setId, ++touchCounter)
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
  // 旧 Room DAO の COALESCE(MAX(scanned_at), created_at) DESC と同じセマンティクス:
  // 最後に作成またはスキャンした draft（＝最後に「作業した」draft）を返す。
  // 単純な作成順（Map 挿入順）ではなく、touched の単調増加カウンタで判定する。
  let latest: ScanSetWithItems | null = null
  let latestTouch = -1
  for (const set of sets.values()) {
    if (set.status !== 'draft') continue
    const t = touched.get(set.id) ?? 0
    if (t > latestTouch) {
      latest = set
      latestTouch = t
    }
  }
  return latest ? structuredClone(latest) : null
}
