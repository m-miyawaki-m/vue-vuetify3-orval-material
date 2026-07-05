import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppTheme = 'dark' | 'light' | 'practice'

export interface ThemeMeta {
  key: AppTheme
  label: string
  description: string
  preview: {
    bg: string
    surface: string
    primary: string
    text: string
  }
}

export const THEMES: ThemeMeta[] = [
  {
    key: 'dark',
    label: 'ダーク',
    description: '目に優しい暗い配色。夜間や低照度環境に最適。',
    preview: { bg: '#121212', surface: '#1E1E1E', primary: '#2196F3', text: '#E0E0E0' },
  },
  {
    key: 'light',
    label: 'ライト',
    description: '薄青基調の明るい配色。日中の使用に適しています。',
    preview: { bg: '#EFF7FF', surface: '#FFFFFF', primary: '#1565C0', text: '#1A1A2E' },
  },
  {
    key: 'practice',
    label: 'プラクティス',
    description: 'オレンジ基調の温かみのある配色。練習・学習用途向け。',
    preview: { bg: '#FFF3E0', surface: '#FFFFFF', primary: '#E65100', text: '#2E1A00' },
  },
]

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<AppTheme>('dark')

  function setTheme(theme: AppTheme) {
    currentTheme.value = theme
  }

  return { currentTheme, setTheme }
}, {
  persist: true,
})
