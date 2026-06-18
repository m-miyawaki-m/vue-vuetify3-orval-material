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
    setupFiles: ['src/test/setup.ts'],
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
