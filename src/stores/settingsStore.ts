import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const errorHistoryLimit = ref<number>(100)

  return { errorHistoryLimit }
}, {
  persist: true,
})
