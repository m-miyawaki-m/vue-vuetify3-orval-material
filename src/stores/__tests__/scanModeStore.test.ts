import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useScanModeStore } from '../scanModeStore'

vi.mock('@/router', () => ({
  default: { push: vi.fn(), back: vi.fn() },
}))

import router from '@/router'

describe('useScanModeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requestScan: オプションを保存して /scan-mode に遷移する', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ title: '商品バーコード', defaultMode: 'barcode', onConfirm })
    expect(store.options?.title).toBe('商品バーコード')
    expect(store.options?.defaultMode).toBe('barcode')
    expect(router.push).toHaveBeenCalledWith('/scan-mode')
  })

  it('complete: raw と resolved を onConfirm に渡して router.back()', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ onConfirm })
    store.complete('4901234567890', { name: 'りんごジュース' })
    expect(onConfirm).toHaveBeenCalledWith('4901234567890', { name: 'りんごジュース' })
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })

  it('complete: resolver なしで生値のみ返却', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ onConfirm })
    store.complete('4901234567890')
    expect(onConfirm).toHaveBeenCalledWith('4901234567890', undefined)
  })

  it('cancel: onConfirm を呼ばずに router.back()', () => {
    const store = useScanModeStore()
    const onConfirm = vi.fn()
    store.requestScan({ onConfirm })
    store.cancel()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(router.back).toHaveBeenCalled()
    expect(store.options).toBeNull()
  })
})
