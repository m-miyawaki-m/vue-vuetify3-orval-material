import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SdkEchoSamplePage from '../SdkEchoSamplePage.vue'

const sdk = {
  echo: vi.fn(),
  echoAsync: vi.fn(),
  addListener: vi.fn(),
  removeAllListeners: vi.fn(),
}
vi.mock('@/plugins/sampleSdk', () => ({
  SampleSdk: {
    echo: (...a: unknown[]) => sdk.echo(...a),
    echoAsync: (...a: unknown[]) => sdk.echoAsync(...a),
    addListener: (...a: unknown[]) => sdk.addListener(...a),
    removeAllListeners: (...a: unknown[]) => sdk.removeAllListeners(...a),
  },
}))

async function mountPage() {
  const wrapper = mount(SdkEchoSamplePage, {
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

async function findButton(wrapper: Awaited<ReturnType<typeof mountPage>>, label: string) {
  const btn = wrapper.findAll('button').find((b) => b.text().includes(label))
  expect(btn, `ボタン「${label}」が見つからない`).toBeDefined()
  return btn!
}

describe('SdkEchoSamplePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sdk.echo.mockResolvedValue({ value: 'ECHOED' })
    sdk.echoAsync.mockResolvedValue(undefined)
    sdk.addListener.mockResolvedValue({ remove: vi.fn() })
  })

  it('マウント時に echoResult リスナーを登録する', async () => {
    await mountPage()
    expect(sdk.addListener).toHaveBeenCalledWith('echoResult', expect.any(Function))
  })

  it('同期で送ると echo に入力値が渡り、返却値が表示される', async () => {
    const wrapper = await mountPage()
    await wrapper.find('input').setValue('ABC-123')
    await (await findButton(wrapper, '同期で送る')).trigger('click')
    await flushPromises()

    expect(sdk.echo).toHaveBeenCalledWith({ value: 'ABC-123' })
    expect(wrapper.text()).toContain('ECHOED')
  })

  it('イベントで送ると echoAsync が呼ばれ、echoResult イベントの値が表示される', async () => {
    const wrapper = await mountPage()
    const listener = sdk.addListener.mock.calls[0]![1] as (data: { value: string }) => void

    await wrapper.find('input').setValue('LOT-42')
    await (await findButton(wrapper, 'イベントで送る')).trigger('click')
    await flushPromises()
    expect(sdk.echoAsync).toHaveBeenCalledWith({ value: 'LOT-42' })

    listener({ value: 'LOT-42' })
    await flushPromises()
    expect(wrapper.text()).toContain('LOT-42')
  })

  it('アンマウント時にリスナーを解除する', async () => {
    const wrapper = await mountPage()
    wrapper.unmount()
    expect(sdk.removeAllListeners).toHaveBeenCalled()
  })
})
