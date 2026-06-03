import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { ja } from 'vuetify/locale'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// ── テーマ定義 ──────────────────────────────────────────

/** ダークテーマ（デフォルト）: 標準的なダーク配色 */
const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121212',
    surface:    '#1E1E1E',
    primary:    '#2196F3',
    secondary:  '#90CAF9',
    error:      '#CF6679',
    info:       '#64B5F6',
    success:    '#81C784',
    warning:    '#FFB74D',
    'on-background': '#E0E0E0',
    'on-surface':    '#E0E0E0',
  },
}

/** ライトテーマ: 薄青基調 */
const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#EFF7FF',
    surface:    '#FFFFFF',
    primary:    '#1565C0',
    secondary:  '#42A5F5',
    error:      '#C62828',
    info:       '#0277BD',
    success:    '#2E7D32',
    warning:    '#E65100',
    'on-background': '#1A1A2E',
    'on-surface':    '#1A1A2E',
  },
}

/** プラクティステーマ: オレンジ基調 */
const practiceTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFF3E0',
    surface:    '#FFFFFF',
    primary:    '#E65100',
    secondary:  '#FFB300',
    error:      '#B71C1C',
    info:       '#01579B',
    success:    '#1B5E20',
    warning:    '#F9A825',
    'on-background': '#2E1A00',
    'on-surface':    '#2E1A00',
  },
}

// ── Vuetify インスタンス ────────────────────────────────

export default createVuetify({
  locale: {
    locale: 'ja',
    messages: { ja },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark:     darkTheme,
      light:    lightTheme,
      practice: practiceTheme,
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
})
