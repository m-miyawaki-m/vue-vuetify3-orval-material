<template>
  <div>
    <p class="text-overline text-medium-emphasis mb-2">
      表示中（{{ store.visibleIds.length }}/9）
    </p>

    <draggable
      v-model="allItemsList"
      item-key="id"
      handle=".drag-handle"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <div
          class="settings-item"
          :class="isVisible(element.id) ? 'settings-item--visible' : 'settings-item--hidden'"
        >
          <v-icon size="18" class="mr-2" :style="isVisible(element.id) ? '' : 'opacity:0.35'">
            {{ element.icon }}
          </v-icon>
          <span
            class="text-body-2 flex-grow-1"
            :style="isVisible(element.id) ? '' : 'opacity:0.35'"
          >{{ element.label }}</span>
          <v-switch
            :model-value="isVisible(element.id)"
            color="primary"
            hide-details
            density="compact"
            class="mr-1"
            :disabled="!isVisible(element.id) && !store.canAddMore"
            @update:model-value="(val) => toggle(element.id, !!val)"
          />
          <v-icon
            class="drag-handle"
            size="20"
            :style="isVisible(element.id) ? 'opacity:0.4;cursor:grab' : 'opacity:0.15;cursor:grab'"
          >mdi-drag</v-icon>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import draggable from 'vuedraggable'
import { useMenuStore } from '@/stores/menuStore'
import type { MenuItem } from '@/stores/menuStore'

const store = useMenuStore()

const allItemsList = ref<MenuItem[]>([...store.visibleItems, ...store.hiddenItems])

function isVisible(id: string): boolean {
  return store.visibleIds.includes(id)
}

function toggle(id: string, val: boolean) {
  if (val) {
    store.addToVisible(id)
  } else {
    store.removeFromVisible(id)
  }
}

function onDragEnd() {
  const newVisibleIds = allItemsList.value
    .filter(m => isVisible(m.id))
    .map(m => m.id)
  store.reorder(newVisibleIds)
}
</script>

<style scoped>
.settings-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 2px;
}
.settings-item--visible {
  background: rgba(var(--v-theme-primary), 0.08);
  border-left: 3px solid rgb(var(--v-theme-primary));
}
.settings-item--hidden {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-left: 3px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
