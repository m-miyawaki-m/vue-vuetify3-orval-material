<template>
  <v-layout style="height: 100dvh; overflow: hidden;">
    <v-app-bar color="primary" elevation="2">
      <template v-if="$slots.prepend" #prepend>
        <slot name="prepend" />
      </template>
      <v-app-bar-title>{{ title }}</v-app-bar-title>
      <template v-if="$slots.actions" #append>
        <slot name="actions" />
      </template>
    </v-app-bar>

    <v-main>
      <div class="main-scroll">
        <slot />
      </div>
    </v-main>

    <!-- カスタムフッタースロット -->
    <div v-if="$slots.footer" class="custom-footer">
      <slot name="footer" />
    </div>

    <v-bottom-navigation
      v-else-if="!hideFooter"
      :model-value="footerActions ? undefined : activeTab"
      color="primary"
    >
      <!-- 業務画面用アクションボタン -->
      <template v-if="footerActions">
        <v-btn
          v-for="action in footerActions"
          :key="action.label"
          :color="action.color"
          :disabled="action.disabled"
          @click="action.onClick"
        >
          <v-icon>{{ action.icon }}</v-icon>
          <span>{{ action.label }}</span>
        </v-btn>
      </template>

      <!-- デフォルト: ナビゲーションタブ -->
      <template v-else>
        <v-btn v-for="tab in navTabs" :key="tab.to" :to="tab.to" :value="tab.to">
          <v-icon>{{ tab.icon }}</v-icon>
          <span>{{ tab.label }}</span>
        </v-btn>
      </template>
    </v-bottom-navigation>
  </v-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { FooterAction } from '@/types/layout'

defineProps<{
  title: string
  footerActions?: FooterAction[]
  hideFooter?: boolean
}>()

const route = useRoute()
const activeTab = computed(() => route.path)

const navTabs = [
  { icon: 'mdi-lightning-bolt', label: 'クイック', to: '/'        },
  { icon: 'mdi-apps',           label: 'メニュー', to: '/menu'    },
  { icon: 'mdi-magnify',        label: '検索',     to: '/search'  },
  { icon: 'mdi-cog',            label: '設定',     to: '/settings' },
]
</script>

<style scoped>
.custom-footer {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgb(var(--v-theme-surface));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}

.main-scroll {
  height: 100%;
  overflow-y: auto;
  width: 100%;
  overflow-x: hidden;
}

:deep(.v-main__wrap) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
