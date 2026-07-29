import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

import { useScanScreen } from '../logic/useScanScreen'
import { useResultScreen } from '../logic/useResultScreen'
import { getPattern } from '../logic/patterns'
import { useScanSessionStore } from '../stores/scanSessionStore'

describe('useScanScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('single: handleScan で結果を保存し結果画面へ遷移する', () => {
    const { handleScan } = useScanScreen(getPattern('single-raw'))
    handleScan({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(1)
    expect(store.single?.raw).toBe('4901234567890')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('continuous: handleScan は蓄積のみで遷移せず、parser で fields が入る', () => {
    const { handleScan } = useScanScreen(getPattern('list-split'))
    handleScan({ text: 'ITEM01,LOT-A,12', format: 'QR_CODE', timestamp: 1 })
    handleScan({ text: 'ITEM02,LOT-B,5', format: 'QR_CODE', timestamp: 2 })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(2)
    expect(store.items[0].fields).toEqual({ productCode: 'ITEM01', lot: 'LOT-A', qty: '12' })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('同一パターンのセッションが残っていれば継続する(items 保持)', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    useScanScreen(getPattern('list-raw'))
    expect(store.items).toHaveLength(1)
  })

  it('別パターンのセッションが残っていれば新規開始する', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    useScanScreen(getPattern('single-raw'))
    expect(store.patternId).toBe('single-raw')
    expect(store.items).toHaveLength(0)
  })

  it('finish で結果画面へ、cancel でセッション破棄して戻る', () => {
    const { finish, cancel } = useScanScreen(getPattern('list-raw'))
    finish()
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/list-raw/result')
    cancel()
    const store = useScanSessionStore()
    expect(store.hasSession).toBe(false)
    expect(mockBack).toHaveBeenCalled()
  })

  it('continuous + OCR: pendingOcrItem に入り items には積まれない', () => {
    const { handleScan, pendingOcrItem } = useScanScreen(getPattern('list-split'))
    handleScan({ text: 'ITEM01,LOT-A,12', format: 'OCR', timestamp: 1 })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(0)
    expect(pendingOcrItem.value?.raw).toBe('ITEM01,LOT-A,12')
    expect(pendingOcrItem.value?.fields.productCode).toBe('ITEM01')
  })

  it('confirmOcr で items に追加され pending がクリアされる', () => {
    const { handleScan, pendingOcrItem, confirmOcr } = useScanScreen(getPattern('list-split'))
    handleScan({ text: 'A,B,1', format: 'OCR', timestamp: 1 })
    confirmOcr({
      raw: 'X,Y,2',
      format: 'OCR',
      timestamp: 1,
      fields: { productCode: 'X', lot: 'Y', qty: '2' },
    })
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(1)
    expect(store.items[0].raw).toBe('X,Y,2')
    expect(pendingOcrItem.value).toBeNull()
  })

  it('discardOcr は items に積まず pending をクリアする', () => {
    const { handleScan, pendingOcrItem, discardOcr } = useScanScreen(getPattern('list-raw'))
    handleScan({ text: 'A', format: 'OCR', timestamp: 1 })
    discardOcr()
    expect(useScanSessionStore().items).toHaveLength(0)
    expect(pendingOcrItem.value).toBeNull()
  })

  it('single + OCR は従来どおり保存して結果画面へ遷移する', () => {
    const { handleScan } = useScanScreen(getPattern('single-raw'))
    handleScan({ text: 'ABC', format: 'OCR', timestamp: 1 })
    expect(useScanSessionStore().items).toHaveLength(1)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('continuous + OCR 以外(バーコード等)は従来どおり直接積む', () => {
    const { handleScan, pendingOcrItem } = useScanScreen(getPattern('list-raw'))
    handleScan({ text: '4901234567890', format: 'EAN_13', timestamp: 1 })
    expect(useScanSessionStore().items).toHaveLength(1)
    expect(pendingOcrItem.value).toBeNull()
  })
})

describe('useResultScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('セッションなしの直接アクセスはスキャン画面へ replace する', () => {
    useResultScreen(getPattern('single-raw'))
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/single-raw')
  })

  it('rescan: single は items を破棄して back する', () => {
    const store = useScanSessionStore()
    store.startSession('single-raw', 'single')
    store.setSingleResult({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    const { rescan } = useResultScreen(getPattern('single-raw'))
    rescan()
    expect(store.items).toHaveLength(0)
    expect(store.hasSession).toBe(true)
    expect(mockBack).toHaveBeenCalled()
  })

  it('rescan: continuous は items を保持して back する', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    const { rescan } = useResultScreen(getPattern('list-raw'))
    rescan()
    expect(store.items).toHaveLength(1)
    expect(mockBack).toHaveBeenCalled()
  })

  it('confirm: セッションを reset して索引へ遷移する', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    const { confirm } = useResultScreen(getPattern('list-raw'))
    confirm()
    expect(store.hasSession).toBe(false)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan')
  })
})
