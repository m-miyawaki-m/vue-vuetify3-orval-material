import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMemoStore = defineStore('memo', () => {
  const memos = ref<Record<number, string>>({})

  function setMemo(productId: number, text: string) {
    memos.value[productId] = text
  }

  function getMemo(productId: number): string {
    return memos.value[productId] ?? ''
  }

  function hasMemo(productId: number): boolean {
    return !!memos.value[productId]?.trim()
  }

  return { memos, setMemo, getMemo, hasMemo }
}, {
  persist: true,
})
