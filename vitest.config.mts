import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'
import Vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    Vue(),
    Vuetify({ autoImport: true }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', 'e2e/**'],
    setupFiles: ['src/test/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.vitest.json',
    },
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
    coverage: {
      provider: 'v8',
      // ターミナル表示 + 静的 HTML（coverage/index.html）を両方出力
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      // カバレッジ計測対象（orval 自動生成・テスト設定・型定義は除外）
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/api/**',       // orval 自動生成
        'src/test/**',      // テストセットアップ
        'src/types/**',     // 型定義のみ
        'src/plugins/**',   // Axios/Vue プラグイン設定
        'src/main.ts',      // エントリポイント
        '**/node_modules/**',
        'e2e/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
