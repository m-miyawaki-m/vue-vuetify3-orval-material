import vuetify from './vuetify'
import router from '@/router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { registerVueQuery } from './vueQuery'
import { registerBackButton } from './backButton'
import type { App } from 'vue'

export function registerPlugins(app: App) {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
  registerVueQuery(app)
  registerBackButton()
}
