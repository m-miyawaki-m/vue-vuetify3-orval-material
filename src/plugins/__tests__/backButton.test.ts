import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ isNative: true }))

const addListener = vi.hoisted(() => vi.fn())
const minimizeApp = vi.hoisted(() => vi.fn())

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => state.isNative },
}))
vi.mock('@capacitor/app', () => ({
  App: { addListener, minimizeApp },
}))

import { registerBackButton } from '@/plugins/backButton'

describe('registerBackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.isNative = true
  })

  it('ネイティブでは backButton リスナーを登録する', () => {
    registerBackButton()
    expect(addListener).toHaveBeenCalledWith('backButton', expect.any(Function))
  })

  it('Web では何も登録しない', () => {
    state.isNative = false
    registerBackButton()
    expect(addListener).not.toHaveBeenCalled()
  })

  it('canGoBack=true なら履歴を1つ戻る', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    registerBackButton()
    const handler = addListener.mock.calls[0][1]
    handler({ canGoBack: true })
    expect(backSpy).toHaveBeenCalledTimes(1)
    expect(minimizeApp).not.toHaveBeenCalled()
    backSpy.mockRestore()
  })

  it('canGoBack=false ならアプリを最小化する（終了ではなく状態維持）', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    registerBackButton()
    const handler = addListener.mock.calls[0][1]
    handler({ canGoBack: false })
    expect(minimizeApp).toHaveBeenCalledTimes(1)
    expect(backSpy).not.toHaveBeenCalled()
    backSpy.mockRestore()
  })
})
