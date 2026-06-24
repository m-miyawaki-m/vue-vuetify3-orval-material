import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlowStepper from '../FlowStepper.vue'

function mountStepper(props: { step: number; steps?: string[] }) {
  return mount(FlowStepper, { props })
}

describe('FlowStepper', () => {
  it('デフォルトラベルを3つ表示する', () => {
    const w = mountStepper({ step: 1 })
    expect(w.text()).toContain('検索')
    expect(w.text()).toContain('一覧')
    expect(w.text()).toContain('詳細')
  })

  it('step=1 のとき完了チェックアイコンが0個', () => {
    const w = mountStepper({ step: 1 })
    expect(w.findAll('.step-done').length).toBe(0)
  })

  it('step=2 のとき完了ステップが1個', () => {
    const w = mountStepper({ step: 2 })
    expect(w.findAll('.step-done').length).toBe(1)
  })

  it('step=3 のとき完了ステップが2個', () => {
    const w = mountStepper({ step: 3 })
    expect(w.findAll('.step-done').length).toBe(2)
  })

  it('カスタム steps を表示できる', () => {
    const w = mountStepper({ step: 1, steps: ['入力', '確認', '完了'] })
    expect(w.text()).toContain('入力')
    expect(w.text()).toContain('確認')
    expect(w.text()).toContain('完了')
    expect(w.text()).not.toContain('検索')
  })

  it('step=0 のとき全ステップが未来状態', () => {
    const w = mountStepper({ step: 0 })
    expect(w.findAll('.step-done').length).toBe(0)
    expect(w.findAll('.step-current').length).toBe(0)
  })
})
