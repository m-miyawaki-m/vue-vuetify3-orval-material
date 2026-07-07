import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface EchoResult {
  value: string
}

export interface SampleSdkPlugin {
  /** パターン①: 値を渡して結果を Promise で受け取る */
  echo(options: { value: string }): Promise<EchoResult>
  /** パターン②: 結果は echoResult イベントで届く */
  echoAsync(options: { value: string }): Promise<void>
  addListener(
    eventName: 'echoResult',
    listener: (data: EchoResult) => void,
  ): Promise<PluginListenerHandle>
  removeAllListeners(): Promise<void>
}

// Android 実機ではネイティブ実装（SampleSdkPlugin.java）、ブラウザでは web フォールバックが使われる
export const SampleSdk = registerPlugin<SampleSdkPlugin>('SampleSdk', {
  web: () => import('./sampleSdkWeb').then((m) => new m.SampleSdkWeb()),
})
