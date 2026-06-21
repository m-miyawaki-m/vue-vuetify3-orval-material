<template>
  <template v-if="item">
    <div class="menu-grid-item menu-grid-item--clickable" @click="emit('click')">
      <div class="menu-grid-item__tile">
        <v-icon :icon="item.icon" size="48" color="white" />
      </div>
      <span class="menu-grid-item__label">{{ item.label }}</span>
    </div>
  </template>
  <div v-else class="menu-grid-item--placeholder" />
</template>

<script setup lang="ts">
import type { MenuItem } from '@/stores/menuStore'

defineProps<{ item?: MenuItem }>()
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.menu-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.menu-grid-item--clickable {
  cursor: pointer;
}
.menu-grid-item__tile {
  width: 80px;
  height: 80px;
  background: rgb(var(--v-theme-primary));
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-grid-item__label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-background));
  text-align: center;
  line-height: 1.3;
  max-width: 88px;
  word-break: break-all;
}
.menu-grid-item--placeholder {
  /* no height — empty-only rows collapse, scanner button moves up */
}
</style>
