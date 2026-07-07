import { WebPlugin } from '@capacitor/core'
import type { EchoResult } from './sampleSdk'

/** ブラウザ開発用フォールバック。ネイティブ SDK（SampleSdk.java）と同じ振る舞いを JS で模擬する */
export class SampleSdkWeb extends WebPlugin {
  async echo(options: { value: string }): Promise<EchoResult> {
    return { value: options.value }
  }

  async echoAsync(options: { value: string }): Promise<void> {
    // デバイス応答の遅延を模擬してからイベント通知する
    setTimeout(() => {
      this.notifyListeners('echoResult', { value: options.value })
    }, 300)
  }
}
