import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanStepHeader from '../components/ScanStepHeader.vue'
import { getStepPattern } from '../logic/stepPatterns'

const steps = getStepPattern('pair-single').steps

describe('ScanStepHeader', () => {
  it('全ステップのラベルと現在ステップの案内文を表示する', () => {
    const w = mount(ScanStepHeader, { props: { steps, currentIndex: 0 } })
    expect(w.text()).toContain('バーコード')
    expect(w.text()).toContain('QR/バーコード')
    expect(w.find('.step-guide').text()).toBe(steps[0].guide)
  })

  it('currentIndex に応じて案内文が切り替わる', async () => {
    const w = mount(ScanStepHeader, { props: { steps, currentIndex: 0 } })
    await w.setProps({ currentIndex: 1 })
    expect(w.find('.step-guide').text()).toBe(steps[1].guide)
  })

  it('currentIndex がステップ数以上でも最終ステップの案内文で安全に表示する', () => {
    const w = mount(ScanStepHeader, { props: { steps, currentIndex: 2 } })
    expect(w.find('.step-guide').text()).toBe(steps[1].guide)
  })
})
