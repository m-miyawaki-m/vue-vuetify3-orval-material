import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanPatternConfig } from './patterns'

/** 一覧カードから遷移する明細画面の結線ロジック(読み取り専用) */
export function useItemDetailScreen(config: ScanPatternConfig) {
  const route = useRoute()
  const router = useRouter()
  const store = useScanSessionStore()

  const index = Number.parseInt(String(route.params.index), 10)
  const item = computed(() => store.items[index] ?? null)

  // 別パターンのセッション・範囲外 index は一覧へ戻す
  // (セッション自体がない場合は一覧側のガードがさらにスキャン画面へ送る)
  if (store.patternId !== config.id || !Number.isInteger(index) || !store.items[index]) {
    router.replace(config.resultPath)
  }

  return {
    item,
    index,
    title: config.title,
    fields: config.fields,
  }
}
