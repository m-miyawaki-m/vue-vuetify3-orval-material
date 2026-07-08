import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.example.myapp',
  appName: 'VuetifyPoC',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Android 15+ のエッジトゥエッジ強制でステータスバーにヘッダーが重なるのを防ぐ
    // （Capacitor 7 の既定は 'disable' = 余白調整なし。8 では 'auto' が既定になる予定）
    adjustMarginsForEdgeToEdge: 'auto',
  },
}

export default config
