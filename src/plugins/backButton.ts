import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

/**
 * Android の戻る操作（ジェスチャー/ボタン）をアプリ内ナビゲーションに割り当てる。
 *
 * Capacitor 7 はブリッジ側で戻るキーを処理しない（@capacitor/app プラグインの責務）。
 * リスナー未登録のままだと戻る操作が Android 標準の「アクティビティ終了」に直行し、
 * 画面を1つ戻る代わりにアプリごとホームへ落ちる。
 */
export function registerBackButton(): void {
  if (!Capacitor.isNativePlatform()) return
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      // ルート画面ではアプリを終了せず最小化する（Android 12+ の標準挙動に合わせ、状態を保つ）
      void CapacitorApp.minimizeApp()
    }
  })
}
