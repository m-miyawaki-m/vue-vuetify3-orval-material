import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useScanListStore } from '../scanListStore'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

import router from '@/router'

describe('useScanListStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requestScanList: オプションを保存して /scan-list に遷移する', () => {
    const store = useScanListStore()
    const onConfirm = vi.fn()
    store.requestScanList({ title: 'テスト', onConfirm })
    expect(store.options?.title).toBe('テスト')
    expect(router.push).toHaveBeenCalledWith('/scan-list')
  })

  it('complete: onConfirm にアイテムを渡して router.back()', () => {
    const store = useScanListStore()
    const onConfirm = vi.fn()
    store.requestScanList({ onConfirm })
    const items = [{ id: '1-0', raw: 'abc', format: 'QR_CODE', timestamp: 1, resolving: false }]
    store.complete(items)
    expect(onConfirm).toHaveBeenCalledWith(items)
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })

  it('cancel: onConfirm を呼ばずに router.back()', () => {
    const store = useScanListStore()
    const onConfirm = vi.fn()
    store.requestScanList({ onConfirm })
    store.cancel()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })

  it('complete: requestScanList 前に呼んでも crash しない', () => {
    const store = useScanListStore()
    expect(() => store.complete([])).not.toThrow()
  })
})
