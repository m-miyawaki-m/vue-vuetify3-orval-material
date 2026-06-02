import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.example.myapp',
  appName: 'VuetifyPoC',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
