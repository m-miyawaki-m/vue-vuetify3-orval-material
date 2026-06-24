// ============================================================
// テスト対象: StatusChipCard (src/components/card/StatusChipCard.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: title / subtitle? / body? / chips?: StatusChip[] / to?
// emits: detail
// ------------------------------------------------------------
// テストケース一覧
//   [表示]
//   [1] title を表示する
//   [2] chips がある場合はラベルを表示する
//   [3] chips がない場合はチップ行を表示しない
//   [4] subtitle を表示する
//   [ナビゲーション]
//   [5] to なし → カードクリックで detail イベントを発火
//   [6] to あり → カードクリックで router.push(to) を呼び出す
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusChipCard from '../StatusChipCard.vue'
import type { StatusChip } from '../StatusChipCard.vue'

const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push: mockPush }) }
})

const chips: StatusChip[] = [
  { label: '在庫あり', color: 'success' },
  { label: '新着', color: 'primary', icon: 'mdi-new-box' },
]

describe('StatusChipCard', () => {
  beforeEach(() => { mockPush.mockClear() })

  it('title を表示する', () => {
    const w = mount(StatusChipCard, { props: { title: '商品A' } })
    expect(w.text()).toContain('商品A')
  })

  it('chips がある場合はラベルを全て表示する', () => {
    const w = mount(StatusChipCard, { props: { title: 'A', chips } })
    expect(w.text()).toContain('在庫あり')
    expect(w.text()).toContain('新着')
  })

  it('chips がない場合はチップ行を表示しない', () => {
    const w = mount(StatusChipCard, { props: { title: 'A' } })
    expect(w.find('.v-chip').exists()).toBe(false)
  })

  it('subtitle を表示する', () => {
    const w = mount(StatusChipCard, { props: { title: 'A', subtitle: 'サブ' } })
    expect(w.text()).toContain('サブ')
  })

  it('to なし → カードクリックで detail イベントを発火', async () => {
    const w = mount(StatusChipCard, { props: { title: 'A' } })
    await w.find('.v-card').trigger('click')
    expect(w.emitted('detail')).toBeTruthy()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('to あり → カードクリックで router.push(to) を呼び出す', async () => {
    const w = mount(StatusChipCard, { props: { title: 'A', to: '/products/1' } })
    await w.find('.v-card').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/products/1')
    expect(w.emitted('detail')).toBeFalsy()
  })
})
