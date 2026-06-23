import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAppAPI } from '@/api/index'
import type { MenuItem } from '@/api/index'
import fallbackData from '@/data/main-menu.json'

const fallback = fallbackData as MenuItem[]

export const useMainMenuStore = defineStore('mainMenu', () => {
  const items = ref<MenuItem[]>([])
  const isLoading = ref(true)
  const isError = ref(false)

  async function fetchMenu() {
    isLoading.value = true
    isError.value = false
    try {
      const { getMenu } = getAppAPI()
      items.value = await getMenu()
    } catch {
      items.value = fallback
      isError.value = true
    } finally {
      isLoading.value = false
    }
  }

  fetchMenu()

  return { items, isLoading, isError, fetchMenu }
})
