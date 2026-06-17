<template>
  <div
    class="menu-grid-item"
    :class="{ 'menu-grid-item--clickable': !!item }"
    @click="item && emit('click')"
  >
    <div class="menu-grid-item__tile" :class="{ 'menu-grid-item__tile--empty': !item }">
      <v-icon v-if="item" :icon="item.icon" size="28" color="white" />
    </div>
    <span v-if="item" class="menu-grid-item__label">{{ item.label }}</span>
  </div>
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
  width: 56px;
  height: 56px;
  background: rgb(var(--v-theme-primary));
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-grid-item__tile--empty {
  background: transparent;
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.15);
}
.menu-grid-item__label {
  font-size: 11px;
  color: rgb(var(--v-theme-on-background));
  text-align: center;
  line-height: 1.3;
  max-width: 64px;
  word-break: break-all;
}
</style>
