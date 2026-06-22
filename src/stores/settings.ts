import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'app-settings'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = load()

  const errorHistoryLimit = ref<number>(saved.errorHistoryLimit ?? 100)

  watch(errorHistoryLimit, () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ errorHistoryLimit: errorHistoryLimit.value }))
  })

  return { errorHistoryLimit }
})
