<template>
  <div>
    <!-- 表示中セクション -->
    <p class="text-overline text-medium-emphasis mb-2">
      表示中（{{ store.visibleIds.length }}/9）
    </p>

    <draggable
      v-model="draggableList"
      item-key="id"
      handle=".drag-handle"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <div class="settings-item settings-item--visible">
          <v-icon size="18" class="mr-2">{{ element.icon }}</v-icon>
          <span class="text-body-2 flex-grow-1">{{ element.label }}</span>
          <v-switch
            :model-value="true"
            color="primary"
            hide-details
            density="compact"
            class="mr-1"
            @update:model-value="store.removeFromVisible(element.id)"
          />
          <v-icon class="drag-handle" size="20" style="opacity:0.4;cursor:grab;">
            mdi-drag
          </v-icon>
        </div>
      </template>
    </draggable>

    <p v-if="store.visibleItems.length === 0" class="text-caption text-medium-emphasis pa-3">
      表示中のメニューがありません
    </p>

    <v-divider class="my-4" />

    <!-- 非表示セクション -->
    <p class="text-overline text-medium-emphasis mb-2">非表示</p>

    <div v-if="store.hiddenItems.length > 0" class="d-flex flex-column gap-1">
      <div
        v-for="item in store.hiddenItems"
        :key="item.id"
        class="settings-item settings-item--hidden"
      >
        <v-icon size="18" class="mr-2" style="opacity:0.4;">{{ item.icon }}</v-icon>
        <span class="text-body-2 flex-grow-1" style="opacity:0.5;">{{ item.label }}</span>
        <v-switch
          :model-value="false"
          color="primary"
          hide-details
          density="compact"
          :disabled="!store.canAddMore"
          @update:model-value="store.addToVisible(item.id)"
        >
          <template v-if="!store.canAddMore" #label>
            <v-tooltip activator="parent" location="top">最大 9 個</v-tooltip>
          </template>
        </v-switch>
      </div>
    </div>

    <p v-else class="text-caption text-medium-emphasis pa-3">
      非表示のメニューはありません
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { useMenuStore } from '@/stores/menuStore'
import type { MenuItem } from '@/stores/menuStore'

const store = useMenuStore()

const draggableList = ref<MenuItem[]>([...store.visibleItems])

watch(
  () => store.visibleItems,
  (items) => { draggableList.value = [...items] },
  { deep: true }
)

function onDragEnd() {
  store.reorder(draggableList.value.map(m => m.id))
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
