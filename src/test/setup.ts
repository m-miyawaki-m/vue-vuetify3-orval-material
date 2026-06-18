import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'

// jsdom にない Vuetify 依存ブラウザ API をモック
Object.defineProperty(window, 'visualViewport', {
  value: {
    width: 375, height: 667, scale: 1,
    offsetLeft: 0, offsetTop: 0,
    addEventListener: () => {}, removeEventListener: () => {},
  },
  writable: true,
})
Object.defineProperty(window, 'ResizeObserver', {
  value: class { observe() {} unobserve() {} disconnect() {} },
  writable: true,
})
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach } from 'vitest'

const vuetify = createVuetify({ components, directives })

config.global.plugins = [vuetify]

beforeEach(() => {
  setActivePinia(createPinia())
})
