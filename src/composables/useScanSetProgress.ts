import { ref, computed } from 'vue'
import type { ScanFeature } from '@/constants/scanFeatures'
import type { ScanItem } from '@/types/quickScan'

export interface ProgressEntry {
  itemKey: string
  label: string
  value: string
  format: string
}

/** 1セット分の読み取り進行状態。DB・カメラには依存しない純粋ロジック */
export function useScanSetProgress(feature: ScanFeature) {
  const entries = ref<ProgressEntry[]>([])

  const nextItem = computed(() => feature.items[entries.value.length] ?? null)
  const isComplete = computed(() => entries.value.length >= feature.items.length)

  function add(value: string, format: string): { seq: number; itemKey: string } | null {
    const item = nextItem.value
    if (!item) return null
    entries.value.push({ itemKey: item.key, label: item.label, value, format })
    return { seq: entries.value.length, itemKey: item.key }
  }

  function reset() {
    entries.value = []
  }

  function restore(items: ScanItem[]) {
    entries.value = [...items]
      .sort((a, b) => a.seq - b.seq)
      .map((i) => ({
        itemKey: i.itemKey,
        label: feature.items.find((f) => f.key === i.itemKey)?.label ?? i.itemKey,
        value: i.value,
        format: i.format,
      }))
  }

  return { entries, nextItem, isComplete, add, reset, restore }
}
