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
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
