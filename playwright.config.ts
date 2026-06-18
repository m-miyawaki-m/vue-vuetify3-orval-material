import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5174',
    screenshot: 'on',          // 全テストでスクリーンショット保存
    trace: 'on',               // 全テストで操作ログ保存（クリック・ネットワーク）
    video: 'retain-on-failure', // 失敗時のみ動画保存
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        // アプリの設計サイズ 360×720 に合わせる
        viewport: { width: 360, height: 720 },
      },
    },
  ],
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60000,
  },
})
