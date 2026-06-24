// ============================================================
// テスト対象: ComboCard (src/components/card/ComboCard.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: title / chips?: ComboChip[] / fields: ComboField[] / actions?: ComboAction[] / to?
// emits: detail / action(index: number)
// ------------------------------------------------------------
// テストケース一覧
//   [表示]
//   [1] title と fields を表示する
//   [2] chips がある場合はラベルを表示する
//   [3] chips がない場合はチップを表示しない
//   [4] actions がある場合はボタンを表示する
//   [ナビゲーション]
//   [5] to なし → カードクリックで detail イベントを発火
//   [6] to あり → カードクリックで router.push(to) を呼び出す
//   [イベント]
//   [7] アクションボタンクリックで action(index) イベントを発火
//   [8] アクションボタンクリックでは detail イベントは発火しない
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ComboCard from '../ComboCard.vue'
import type { ComboChip, ComboField, ComboAction } from '../ComboCard.vue'

const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push: mockPush }) }
})

const fields: ComboField[] = [
  { icon: 'mdi-account', label: '担当', value: '田中' },
  { icon: 'mdi-calendar', label: '日付', value: '2024-06-01', bold: true },
]
const chips: ComboChip[] = [{ label: '緊急', color: 'error' }]
const actions: ComboAction[] = [
  { label: '承認', icon: 'mdi-check', color: 'success' },
  { label: '却下', icon: 'mdi-close', color: 'error' },
]

describe('ComboCard', () => {
  beforeEach(() => { mockPush.mockClear() })

  it('title と fields を表示する', () => {
    const w = mount(ComboCard, { props: { title: '案件A', fields } })
    expect(w.text()).toContain('案件A')
    expect(w.text()).toContain('担当')
    expect(w.text()).toContain('田中')
    expect(w.text()).toContain('2024-06-01')
  })

  it('chips がある場合はラベルを表示する', () => {
    const w = mount(ComboCard, { props: { title: 'A', fields, chips } })
    expect(w.text()).toContain('緊急')
  })

  it('chips がない場合はチップを表示しない', () => {
    const w = mount(ComboCard, { props: { title: 'A', fields } })
    expect(w.findAll('.v-chip').length).toBe(0)
  })

  it('actions がある場合はボタンを表示する', () => {
    const w = mount(ComboCard, { props: { title: 'A', fields, actions } })
    expect(w.text()).toContain('承認')
    expect(w.text()).toContain('却下')
  })

  it('to なし → カードクリックで detail イベントを発火', async () => {
    const w = mount(ComboCard, { props: { title: 'A', fields } })
    await w.find('.v-card').trigger('click')
    expect(w.emitted('detail')).toBeTruthy()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('to あり → カードクリックで router.push(to) を呼び出す', async () => {
    const w = mount(ComboCard, { props: { title: 'A', fields, to: '/orders/1' } })
    await w.find('.v-card').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/orders/1')
    expect(w.emitted('detail')).toBeFalsy()
  })

  it('アクションボタンクリックで action(index) イベントを発火', async () => {
    const w = mount(ComboCard, { props: { title: 'A', fields, actions } })
    const btn = w.findAll('button').find(b => b.text().includes('承認'))
    await btn?.trigger('click')
    expect(w.emitted('action')?.[0]).toEqual([0])
  })

  it('アクションボタンクリックでは detail イベントは発火しない', async () => {
    const w = mount(ComboCard, { props: { title: 'A', fields, actions } })
    const btn = w.findAll('button').find(b => b.text().includes('承認'))
    await btn?.trigger('click')
    expect(w.emitted('detail')).toBeFalsy()
  })
})
