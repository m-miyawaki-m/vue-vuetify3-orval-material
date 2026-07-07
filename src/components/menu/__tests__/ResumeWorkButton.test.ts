import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ResumeWorkButton from '../ResumeWorkButton.vue'
import type { ScanSetWithItems } from '@/types/quickScan'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

const findLatestDraft = vi.fn()
const countDrafts = vi.fn()
vi.mock('@/db/scanRecordRepository', () => ({
  findLatestDraft: (...a: unknown[]) => findLatestDraft(...a),
  countDrafts: (...a: unknown[]) => countDrafts(...a),
}))

import router from '@/router'

const draftSet: ScanSetWithItems = {
  id: 'set-1',
  featureId: 'inbound',
  status: 'draft',
  createdAt: '2026-07-07T05:32:00.000Z',
  confirmedAt: null,
  items: [],
}

describe('ResumeWorkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findLatestDraft.mockResolvedValue(null)
    countDrafts.mockResolvedValue({})
  })

  it('draft なし: 「作業なし」で disabled', async () => {
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    expect(wrapper.text()).toContain('作業なし')
    expect(wrapper.find('.v-btn').attributes('disabled')).toBeDefined()
  })

  it('draft あり: 機能名と件数を表示する', async () => {
    findLatestDraft.mockResolvedValue(draftSet)
    countDrafts.mockResolvedValue({ inbound: 3 })
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    expect(wrapper.text()).toContain('入荷作業を再開')
    expect(wrapper.text()).toContain('3件')
  })

  it('タップで /quick-scan/:featureId へ遷移する', async () => {
    findLatestDraft.mockResolvedValue(draftSet)
    countDrafts.mockResolvedValue({ inbound: 3 })
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    await wrapper.find('.v-btn').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/quick-scan/inbound')
  })

  it('DB エラー時: 「作業なし」で disabled のまま', async () => {
    findLatestDraft.mockRejectedValue(new Error('db error'))
    const wrapper = mount(ResumeWorkButton)
    await flushPromises()
    expect(wrapper.text()).toContain('作業なし')
    expect(wrapper.find('.v-btn').attributes('disabled')).toBeDefined()
  })
})
