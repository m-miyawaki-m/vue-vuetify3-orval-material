import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import QuickScanWorkPage from '../QuickScanWorkPage.vue'
import type { ScanResult } from '@/types/scanner'
import type { ScanSetWithItems } from '@/types/quickScan'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn(), replace: vi.fn() },
}))

let capturedOnScan: ((result: ScanResult) => void) | null = null
const mockStart = vi.fn()
const mockStop = vi.fn()

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((videoRef, options) => {
    capturedOnScan = options.onScan
    return { start: mockStart, stop: mockStop, error: ref(null), torchAvailable: ref(false), switchTorch: vi.fn() }
  }),
}))

const repo = {
  createDraftSet: vi.fn(),
  addItem: vi.fn(),
  deleteSet: vi.fn(),
  clearDrafts: vi.fn(),
  confirmCompletedDrafts: vi.fn(),
  findDraftSets: vi.fn(),
}
vi.mock('@/db/scanRecordRepository', () => ({
  createDraftSet: (...a: unknown[]) => repo.createDraftSet(...a),
  addItem: (...a: unknown[]) => repo.addItem(...a),
  deleteSet: (...a: unknown[]) => repo.deleteSet(...a),
  clearDrafts: (...a: unknown[]) => repo.clearDrafts(...a),
  confirmCompletedDrafts: (...a: unknown[]) => repo.confirmCompletedDrafts(...a),
  findDraftSets: (...a: unknown[]) => repo.findDraftSets(...a),
}))

function makeSet(id: string, itemValues: string[]): ScanSetWithItems {
  return {
    id,
    featureId: 'inbound',
    status: 'draft',
    createdAt: '2026-07-07T10:00:00.000Z',
    confirmedAt: null,
    items: itemValues.map((value, i) => ({
      id: `${id}-i${i + 1}`,
      setId: id,
      seq: i + 1,
      itemKey: ['part_no', 'lot', 'qty'][i],
      value,
      format: 'MOCK',
      scannedAt: '2026-07-07T10:00:01.000Z',
    })),
  }
}

async function mountPage(featureId = 'inbound') {
  const wrapper = mount(QuickScanWorkPage, {
    props: { featureId },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

describe('QuickScanWorkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
    repo.findDraftSets.mockResolvedValue([])
    repo.createDraftSet.mockResolvedValue(makeSet('set-new', []))
    repo.addItem.mockImplementation((setId, input) =>
      Promise.resolve({ id: 'i', setId, ...(input as object), scannedAt: '' })
    )
    repo.confirmCompletedDrafts.mockResolvedValue(0)
  })

  it('マウント時に findDraftSets で復元し、カメラを起動する', async () => {
    await mountPage()
    expect(repo.findDraftSets).toHaveBeenCalledWith('inbound')
    expect(mockStart).toHaveBeenCalled()
  })

  it('初期状態のガイドは1項目目（品番）を促す', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('次は「品番」を読み取ってください')
  })

  it('スキャンで createDraftSet → addItem(seq=1) が呼ばれ、ガイドが次項目に進む', async () => {
    const wrapper = await mountPage()
    capturedOnScan!({ text: '4901234567894', format: 'EAN_13', timestamp: 1 })
    await flushPromises()
    expect(repo.createDraftSet).toHaveBeenCalledWith('inbound')
    expect(repo.addItem).toHaveBeenCalledWith('set-new', {
      seq: 1, itemKey: 'part_no', value: '4901234567894', format: 'EAN_13',
    })
    expect(wrapper.text()).toContain('次は「ロット」を読み取ってください')
  })

  it('3項目読み終えるとセット完成 → findDraftSets で再読込される', async () => {
    await mountPage()
    capturedOnScan!({ text: 'a', format: 'MOCK', timestamp: 1 })
    await flushPromises()
    capturedOnScan!({ text: 'b', format: 'MOCK', timestamp: 2 })
    await flushPromises()
    repo.findDraftSets.mockResolvedValue([makeSet('set-new', ['a', 'b', 'c'])])
    capturedOnScan!({ text: 'c', format: 'MOCK', timestamp: 3 })
    await flushPromises()
    expect(repo.createDraftSet).toHaveBeenCalledTimes(1) // セットは1回だけ作成
    expect(repo.addItem).toHaveBeenCalledTimes(3)
    expect(repo.findDraftSets).toHaveBeenCalledTimes(2) // 初期化 + 完成時
  })

  it('途中セットがあれば続きから復元される', async () => {
    repo.findDraftSets.mockResolvedValue([makeSet('set-partial', ['4901234567894'])])
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('次は「ロット」を読み取ってください')
    // 次のスキャンは既存セットに seq=2 で追加され、新規セットは作られない
    capturedOnScan!({ text: 'LOT-1', format: 'QR_CODE', timestamp: 1 })
    await flushPromises()
    expect(repo.createDraftSet).not.toHaveBeenCalled()
    expect(repo.addItem).toHaveBeenCalledWith('set-partial', {
      seq: 2, itemKey: 'lot', value: 'LOT-1', format: 'QR_CODE',
    })
  })

  it('確定ボタンで confirmCompletedDrafts(featureId, 項目数) が呼ばれる', async () => {
    repo.findDraftSets.mockResolvedValue([makeSet('set-1', ['a', 'b', 'c'])])
    repo.confirmCompletedDrafts.mockResolvedValue(1)
    const wrapper = await mountPage()
    const confirmBtn = wrapper.find('[data-testid="confirm-btn"]')
    await confirmBtn.trigger('click')
    await flushPromises()
    expect(repo.confirmCompletedDrafts).toHaveBeenCalledWith('inbound', 3)
  })

  it('完成セットが0件なら確定ボタンは disabled', async () => {
    const wrapper = await mountPage()
    const confirmBtn = wrapper.find('[data-testid="confirm-btn"]')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })
})
