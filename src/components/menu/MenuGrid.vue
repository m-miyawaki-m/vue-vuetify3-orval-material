<template>
  <div class="menu-grid">
    <MenuGridItem
      v-for="i in 9"
      :key="i"
      :item="store.visibleItems[i - 1]"
      @click="onItemClick(i - 1)"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useMenuStore } from '@/stores/menuStore'
import MenuGridItem from './MenuGridItem.vue'

const store = useMenuStore()
const router = useRouter()

function onItemClick(index: number) {
  const item = store.visibleItems[index]
  if (item) router.push(item.to)
}
</script>

<style scoped>
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 28px 24px;
}
</style>
