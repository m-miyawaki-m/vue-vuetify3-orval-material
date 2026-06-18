<template>
  <div>
    <p class="text-overline text-medium-emphasis mb-3">テーマ</p>
    <div class="d-flex flex-column gap-3">
      <v-card
        v-for="theme in THEMES"
        :key="theme.key"
        :variant="themeStore.currentTheme === theme.key ? 'elevated' : 'outlined'"
        :color="themeStore.currentTheme === theme.key ? 'primary' : undefined"
        class="cursor-pointer"
        @click="themeStore.setTheme(theme.key)"
      >
        <v-card-text class="d-flex align-center gap-4 pa-4">
          <!-- カラープレビュー -->
          <div class="theme-preview" :style="{ background: theme.preview.bg }">
            <div class="theme-preview__bar" :style="{ background: theme.preview.primary }" />
            <div class="theme-preview__surface" :style="{ background: theme.preview.surface }">
              <div class="theme-preview__chip" :style="{ background: theme.preview.primary }" />
            </div>
          </div>

          <!-- テキスト -->
          <div style="flex: 1">
            <p class="text-subtitle-1 font-weight-bold">{{ theme.label }}</p>
            <p class="text-caption text-medium-emphasis">{{ theme.description }}</p>
          </div>

          <!-- チェックマーク -->
          <v-icon v-if="themeStore.currentTheme === theme.key" color="primary">
            mdi-check-circle
          </v-icon>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore, THEMES } from '@/stores/theme'

const themeStore = useThemeStore()
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.theme-preview {
  width: 64px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
}
.theme-preview__bar {
  height: 12px;
  width: 100%;
}
.theme-preview__surface {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 4px 6px;
  gap: 4px;
}
.theme-preview__chip {
  height: 8px;
  width: 20px;
  border-radius: 4px;
  opacity: 0.85;
}
</style>
