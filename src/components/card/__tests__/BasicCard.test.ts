// ============================================================
// テスト対象: BasicCard (src/components/card/BasicCard.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: title / subtitle? / body? / to?
// emits: detail
// ------------------------------------------------------------
// テストケース一覧
//   [表示]
//   [1] title を表示する
//   [2] subtitle がある場合は表示する
//   [3] subtitle がない場合は非表示
//   [4] body テキストを表示する
//   [5] body がない場合は非表示
//   [ナビゲーション]
//   [6] to なし → カードクリックで detail イベントを発火
//   [7] to なし → 詳細ボタンクリックで detail イベントを発火
//   [8] to あり → カードクリックで router.push(to) を呼び出す
//   [9] to あり → detail イベントは発火しない
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BasicCard from '../BasicCard.vue'

const mockPush = vi.fn()
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push: mockPush }) }
})

describe('BasicCard', () => {
  beforeEach(() => { mockPush.mockClear() })

  it('title を表示する', () => {
    const w = mount(BasicCard, { props: { title: 'テスト商品' } })
    expect(w.text()).toContain('テスト商品')
  })

  it('subtitle がある場合は表示する', () => {
    const w = mount(BasicCard, { props: { title: 'A', subtitle: 'サブタイトル' } })
    expect(w.text()).toContain('サブタイトル')
  })

  it('subtitle がない場合は非表示', () => {
    const w = mount(BasicCard, { props: { title: 'A' } })
    expect(w.find('.v-card-subtitle').exists()).toBe(false)
  })

  it('body テキストを表示する', () => {
    const w = mount(BasicCard, { props: { title: 'A', body: '本文テキスト' } })
    expect(w.text()).toContain('本文テキスト')
  })

  it('body がない場合は非表示', () => {
    const w = mount(BasicCard, { props: { title: 'A' } })
    expect(w.find('.v-card-text').exists()).toBe(false)
  })

  it('to なし → カードクリックで detail イベントを発火', async () => {
    const w = mount(BasicCard, { props: { title: 'A' } })
    await w.find('.v-card').trigger('click')
    expect(w.emitted('detail')).toBeTruthy()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('to なし → 詳細ボタンクリックで detail イベントを発火', async () => {
    const w = mount(BasicCard, { props: { title: 'A' } })
    const btn = w.findAll('button').find(b => b.text().includes('詳細を見る'))
    await btn?.trigger('click')
    expect(w.emitted('detail')).toBeTruthy()
  })

  it('to あり → カードクリックで router.push(to) を呼び出す', async () => {
    const w = mount(BasicCard, { props: { title: 'A', to: '/detail/1' } })
    await w.find('.v-card').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/detail/1')
    expect(w.emitted('detail')).toBeFalsy()
  })

  it('to あり → detail イベントは発火しない', async () => {
    const w = mount(BasicCard, { props: { title: 'A', to: '/detail/1' } })
    const btn = w.findAll('button').find(b => b.text().includes('詳細を見る'))
    await btn?.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/detail/1')
    expect(w.emitted('detail')).toBeFalsy()
  })
})
