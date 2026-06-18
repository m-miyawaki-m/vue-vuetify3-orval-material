<template>
  <v-layout style="height: 100dvh; overflow: hidden;">
    <v-app-bar color="primary" elevation="2">
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

    <v-bottom-navigation
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
.main-scroll {
  height: 100%;
  overflow-y: auto;
}

:deep(.v-main__wrap) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
