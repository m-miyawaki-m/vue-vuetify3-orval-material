// ============================================================
// テスト対象: SearchConditionChips (src/components/search/SearchConditionChips.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: q(キーワード) / category(カテゴリ) / inStock(在庫フラグ) / closable
// ------------------------------------------------------------
// テストケース一覧
//   [1] 条件なし →「条件なし（全件）」を表示
//   [2] q あり   → キーワードチップを表示
//   [3] category → カテゴリチップを表示
//   [4] inStock  → 在庫ありチップを表示
//   [5] 複数条件 → すべてのチップを同時表示
//   [6] closable=false → 閉じるボタン非表示
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchConditionChips from '../SearchConditionChips.vue'

describe('SearchConditionChips', () => {
  it('条件なしの場合「条件なし（全件）」を表示', () => {
    const wrapper = mount(SearchConditionChips)
    expect(wrapper.text()).toContain('条件なし（全件）')
  })

  it('q を渡すとキーワードチップを表示', () => {
    const wrapper = mount(SearchConditionChips, { props: { q: '緑茶' } })
    expect(wrapper.text()).toContain('緑茶')
    expect(wrapper.text()).not.toContain('条件なし')
  })

  it('category を渡すとカテゴリチップを表示', () => {
    const wrapper = mount(SearchConditionChips, { props: { category: '食品' } })
    expect(wrapper.text()).toContain('食品')
  })

  it('inStock=true で在庫ありチップを表示', () => {
    const wrapper = mount(SearchConditionChips, { props: { inStock: true } })
    expect(wrapper.text()).toContain('在庫あり')
  })

  it('複数条件を同時に表示できる', () => {
    const wrapper = mount(SearchConditionChips, {
      props: { q: '緑茶', category: '食品', inStock: true },
    })
    expect(wrapper.text()).toContain('緑茶')
    expect(wrapper.text()).toContain('食品')
    expect(wrapper.text()).toContain('在庫あり')
  })

  it('closable=false のとき閉じるボタンが表示されない', () => {
    const wrapper = mount(SearchConditionChips, {
      props: { q: '緑茶', closable: false },
    })
    expect(wrapper.find('.v-chip__close').exists()).toBe(false)
  })
})
