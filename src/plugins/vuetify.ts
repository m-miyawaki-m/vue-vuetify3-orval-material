import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { ja } from 'vuetify/locale'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// ── テーマ定義 ────────────────────────────────────────────

const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    // ── 標準カラー ────────────────────────────
    background:      '#121212',
    surface:         '#1E1E1E',
    primary:         '#2196F3',
    secondary:       '#90CAF9',
    error:           '#CF6679',
    info:            '#64B5F6',
    success:         '#81C784',
    warning:         '#FFB74D',
    'on-background': '#E0E0E0',
    'on-surface':    '#E0E0E0',
    // ── 自作カラー ────────────────────────────
    cardBg:    '#2C2C2C',
    divider:   '#3A3A3A',
    textMuted: '#757575',
    inputBg:   '#2A2A2A',
  },
  variables: {
    'border-color':   '58, 58, 58',   // divider と合わせる（RGB）
    'border-opacity': 1,
  },
}

const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    // ── 標準カラー ────────────────────────────
    background:      '#EFF7FF',
    surface:         '#FFFFFF',
    primary:         '#1565C0',
    secondary:       '#42A5F5',
    error:           '#C62828',
    info:            '#0277BD',
    success:         '#2E7D32',
    warning:         '#E65100',
    'on-background': '#1A1A2E',
    'on-surface':    '#1A1A2E',
    // ── 自作カラー ────────────────────────────
    cardBg:    '#FFFFFF',
    divider:   '#DDEEFF',
    textMuted: '#7B8EA8',
    inputBg:   '#F5FAFF',
  },
  variables: {
    'border-color':   '221, 238, 255',
    'border-opacity': 1,
  },
}

const practiceTheme: ThemeDefinition = {
  dark: false,
  colors: {
    // ── 標準カラー ────────────────────────────
    background:      '#FFF3E0',
    surface:         '#FFFFFF',
    primary:         '#E65100',
    secondary:       '#FFB300',
    error:           '#B71C1C',
    info:            '#01579B',
    success:         '#1B5E20',
    warning:         '#F9A825',
    'on-background': '#2E1A00',
    'on-surface':    '#2E1A00',
    // ── 自作カラー ────────────────────────────
    cardBg:    '#FFFFFF',
    divider:   '#FFD9B3',
    textMuted: '#A07050',
    inputBg:   '#FFF8F0',
  },
  variables: {
    'border-color':   '255, 217, 179',
    'border-opacity': 1,
  },
}

// ── Vuetify インスタンス ──────────────────────────────────

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
