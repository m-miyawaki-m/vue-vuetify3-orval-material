import { describe, it, expect, vi, afterEach } from 'vitest'
import { SampleSdkWeb } from '../sampleSdkWeb'

describe('SampleSdkWeb', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('echo は渡した値をそのまま返す', async () => {
    const sdk = new SampleSdkWeb()
    await expect(sdk.echo({ value: 'ABC-123' })).resolves.toEqual({ value: 'ABC-123' })
  })

  it('echoAsync は echoResult イベントで渡した値をそのまま通知する', async () => {
    vi.useFakeTimers()
    const sdk = new SampleSdkWeb()
    const received: string[] = []
    await sdk.addListener('echoResult', (data: { value: string }) => {
      received.push(data.value)
    })

    await sdk.echoAsync({ value: 'LOT-42' })
    // 呼び出し直後は届かない（デバイス応答の非同期通知を模擬しているため）
    expect(received).toEqual([])

    vi.advanceTimersByTime(300)
    expect(received).toEqual(['LOT-42'])
  })
})
