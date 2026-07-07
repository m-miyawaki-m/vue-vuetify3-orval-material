import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import QuickScanMenuPage from '../QuickScanMenuPage.vue'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

const countDrafts = vi.fn()
vi.mock('@/db/scanRecordRepository', () => ({
  countDrafts: (...args: unknown[]) => countDrafts(...args),
}))

import router from '@/router'

function mountPage() {
  return mount(QuickScanMenuPage, {
    global: {
      stubs: {
        MainLayout: { template: '<div><slot name="prepend" /><slot /></div>' },
      },
    },
  })
}

describe('QuickScanMenuPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    countDrafts.mockResolvedValue({})
  })

  it('3機能のボタンが表示される', async () => {
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('入荷')
    expect(wrapper.text()).toContain('出荷')
    expect(wrapper.text()).toContain('現品確認')
  })

  it('未確定件数バッジが表示される', async () => {
    countDrafts.mockResolvedValue({ inbound: 3 })
    const wrapper = mountPage()
    await flushPromises()
    expect(wrapper.text()).toContain('3')
  })

  it('機能ボタンタップで /quick-scan/:featureId へ遷移する', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const inboundBtn = wrapper.findAll('.quick-scan-feature-btn')[0]
    await inboundBtn.trigger('click')
    expect(router.push).toHaveBeenCalledWith('/quick-scan/inbound')
  })
})
