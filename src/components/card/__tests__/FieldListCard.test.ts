// ============================================================
// テスト対象: FieldListCard (src/components/card/FieldListCard.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: title / fields: CardField[] / to?
// emits: detail
// ------------------------------------------------------------
// テストケース一覧
//   [表示]
//   [1] title を表示する
//   [2] fields の label と value を全て表示する
//   [3] bold=true のフィールドは font-weight-bold クラスを持つ
//   [4] bold なしのフィールドは font-weight-bold クラスを持たない
//   [ナビゲーション]
//   [5] to なし → カードクリックで detail イベントを発火
//   [6] to あり → カードクリックで router.push(to) を呼び出す
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldListCard from '../FieldListCard.vue'
import type { CardField } from '../FieldListCard.vue'

const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push: mockPush }) }
})

const fields: CardField[] = [
  { icon: 'mdi-account', label: '担当者', value: '田中 太郎', bold: true },
  { icon: 'mdi-calendar', label: '日付', value: '2024-06-01' },
]

describe('FieldListCard', () => {
  beforeEach(() => { mockPush.mockClear() })

  it('title を表示する', () => {
    const w = mount(FieldListCard, { props: { title: '案件詳細', fields } })
    expect(w.text()).toContain('案件詳細')
  })

  it('fields の label と value を全て表示する', () => {
    const w = mount(FieldListCard, { props: { title: 'A', fields } })
    expect(w.text()).toContain('担当者')
    expect(w.text()).toContain('田中 太郎')
    expect(w.text()).toContain('日付')
    expect(w.text()).toContain('2024-06-01')
  })

  it('bold=true のフィールド値は font-weight-bold クラスを持つ', () => {
    const w = mount(FieldListCard, { props: { title: 'A', fields } })
    const boldEl = w.findAll('span.text-body-2').find(s => s.text().includes('田中 太郎'))
    expect(boldEl?.classes()).toContain('font-weight-bold')
  })

  it('bold なしのフィールド値は font-weight-bold クラスを持たない', () => {
    const w = mount(FieldListCard, { props: { title: 'A', fields } })
    const normalEl = w.findAll('span.text-body-2').find(s => s.text().includes('2024-06-01'))
    expect(normalEl?.classes()).not.toContain('font-weight-bold')
  })

  it('to なし → カードクリックで detail イベントを発火', async () => {
    const w = mount(FieldListCard, { props: { title: 'A', fields } })
    await w.find('.v-card').trigger('click')
    expect(w.emitted('detail')).toBeTruthy()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('to あり → カードクリックで router.push(to) を呼び出す', async () => {
    const w = mount(FieldListCard, { props: { title: 'A', fields, to: '/orders/1' } })
    await w.find('.v-card').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/orders/1')
    expect(w.emitted('detail')).toBeFalsy()
  })
})
