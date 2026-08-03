import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

import PairSingleResultPage from '../pages/PairSingleResultPage.vue'
import PairListResultPage from '../pages/PairListResultPage.vue'
import { useStepScanSessionStore } from '../stores/stepScanSessionStore'
import type { ScanItem } from '../types'

const mountOpts = { global: { stubs: { teleport: true } } }

const item = (raw: string, format = 'EAN_13'): ScanItem => ({
  raw,
  format,
  timestamp: 1,
  fields: {},
})

function seedSingle() {
  const store = useStepScanSessionStore()
  store.startSession('pair-single', 'single')
  store.addPart(item('BAR-1'))
  store.addPart(item('QR-1', 'QR_CODE'))
  store.completeSet()
  return store
}

function seedList(pairs: Array<[string, string]>) {
  const store = useStepScanSessionStore()
  store.startSession('pair-list', 'continuous')
  for (const [a, b] of pairs) {
    store.addPart(item(a))
    store.addPart(item(b, 'QR_CODE'))
    store.completeSet()
  }
  return store
}

describe('PairSingleResultPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('セッションなしの直接アクセスはスキャン画面へ replace する', () => {
    mount(PairSingleResultPage, mountOpts)
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/pair-single')
  })

  it('組の両方の値がステップのラベル付きで表示される', () => {
    seedSingle()
    const w = mount(PairSingleResultPage, mountOpts)
    expect(w.text()).toContain('バーコード')
    expect(w.text()).toContain('BAR-1')
    expect(w.text()).toContain('QR/バーコード')
    expect(w.text()).toContain('QR-1')
  })

  it('再スキャンで組を破棄して戻り、確定で reset して索引へ', async () => {
    const store = seedSingle()
    const w = mount(PairSingleResultPage, mountOpts)
    const rescanBtn = w.findAll('button').find((b) => b.text().includes('再スキャン'))!
    await rescanBtn.trigger('click')
    expect(store.setCount).toBe(0)
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('PairListResultPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('組ごとのカードが表示され、削除ボタンで組を消せる', async () => {
    const store = seedList([['BAR-1', 'QR-1'], ['BAR-2', 'QR-2']])
    const w = mount(PairListResultPage, mountOpts)
    expect(w.text()).toContain('読取済み: 2組')
    expect(w.text()).toContain('BAR-1')
    expect(w.text()).toContain('QR-2')
    await w.findAll('.remove-btn')[0].trigger('click')
    expect(store.setCount).toBe(1)
    expect(w.text()).not.toContain('BAR-1')
  })

  it('確定でセッションを reset して索引へ遷移する', async () => {
    const store = seedList([['BAR-1', 'QR-1']])
    const w = mount(PairListResultPage, mountOpts)
    const confirmBtn = w.findAll('button').find((b) => b.text().includes('確定'))!
    await confirmBtn.trigger('click')
    expect(store.hasSession).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan')
  })

  it('0組のとき確定は disabled', () => {
    const store = useStepScanSessionStore()
    store.startSession('pair-list', 'continuous')
    const w = mount(PairListResultPage, mountOpts)
    const confirmBtn = w.findAll('button').find((b) => b.text().includes('確定'))!
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })
})
