import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface MenuItem {
  id: string
  label: string
  icon: string
  to: string
}

export const MENU_MASTER: MenuItem[] = [
  { id: 'search',    label: '商品を探す',       icon: 'mdi-magnify',        to: '/search'    },
  { id: 'favorites', label: 'お気に入り',        icon: 'mdi-heart',          to: '/favorites' },
  { id: 'settings',  label: '設定',             icon: 'mdi-cog',            to: '/settings'  },
  { id: 'samples',      label: 'コンポーネント',  icon: 'mdi-palette-swatch',  to: '/samples'      },
  { id: 'card-samples', label: 'カードサンプル',  icon: 'mdi-card-multiple',   to: '/card-samples' },
  { id: 'scanner',      label: 'スキャナー',      icon: 'mdi-barcode-scan',    to: '/scanner-sample' },
]

export const useMenuStore = defineStore('menu', () => {
  const visibleIds = ref<string[]>(MENU_MASTER.map(m => m.id))

  const visibleItems = computed(() =>
    visibleIds.value
      .map(id => MENU_MASTER.find(m => m.id === id))
      .filter((m): m is MenuItem => m !== undefined)
  )

  const hiddenItems = computed(() =>
    MENU_MASTER.filter(m => !visibleIds.value.includes(m.id))
  )

  const canAddMore = computed(() => visibleIds.value.length < 9)

  function addToVisible(id: string) {
    if (!canAddMore.value || visibleIds.value.includes(id)) return
    visibleIds.value = [...visibleIds.value, id]
  }

  function removeFromVisible(id: string) {
    visibleIds.value = visibleIds.value.filter(v => v !== id)
  }

  function reorder(newIds: string[]) {
    visibleIds.value = newIds
  }

  return { visibleIds, visibleItems, hiddenItems, canAddMore, addToVisible, removeFromVisible, reorder }
}, {
  persist: true,
})
