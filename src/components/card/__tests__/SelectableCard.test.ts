// ============================================================
// テスト対象: SelectableCard (src/components/card/SelectableCard.vue)
// 種別: コンポーネントユニットテスト
// ------------------------------------------------------------
// props: modelValue / name / code / date / status / statusColor
// emits: update:modelValue
// ------------------------------------------------------------
// テストケース一覧
//   [表示]
//   [1] name / code / date を表示する
//   [2] status チップを表示する
//   [状態]
//   [3] modelValue=false → variant=elevated でレンダリング
//   [4] modelValue=true → variant=tonal でレンダリング
//   [イベント]
//   [5] カードクリックで update:modelValue を !modelValue で発火
//   [6] modelValue=true のカードクリックで false を発火
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectableCard from '../SelectableCard.vue'

const baseProps = {
  modelValue: false,
  name: 'オーガニック緑茶',
  code: 'PRD-001',
  date: '2024-06-01',
  status: '承認済み',
  statusColor: 'success',
}

describe('SelectableCard', () => {
  it('name / code / date を表示する', () => {
    const w = mount(SelectableCard, { props: baseProps })
    expect(w.text()).toContain('オーガニック緑茶')
    expect(w.text()).toContain('PRD-001')
    expect(w.text()).toContain('2024-06-01')
  })

  it('status チップを表示する', () => {
    const w = mount(SelectableCard, { props: baseProps })
    expect(w.text()).toContain('承認済み')
    expect(w.find('.v-chip').exists()).toBe(true)
  })

  it('modelValue=false のとき v-card--variant-elevated クラスを持つ', () => {
    const w = mount(SelectableCard, { props: { ...baseProps, modelValue: false } })
    expect(w.find('.v-card').classes()).toContain('v-card--variant-elevated')
  })

  it('modelValue=true のとき v-card--variant-tonal クラスを持つ', () => {
    const w = mount(SelectableCard, { props: { ...baseProps, modelValue: true } })
    expect(w.find('.v-card').classes()).toContain('v-card--variant-tonal')
  })

  it('modelValue=false のカードクリックで update:modelValue=true を発火', async () => {
    const w = mount(SelectableCard, { props: { ...baseProps, modelValue: false } })
    await w.find('.v-card').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('modelValue=true のカードクリックで update:modelValue=false を発火', async () => {
    const w = mount(SelectableCard, { props: { ...baseProps, modelValue: true } })
    await w.find('.v-card').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
