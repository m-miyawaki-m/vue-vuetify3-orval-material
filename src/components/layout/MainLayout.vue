<template>
  <v-layout style="height: 100dvh; overflow: hidden;">
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>{{ title }}</v-app-bar-title>
      <template v-if="$slots.actions" #append>
        <slot name="actions" />
      </template>
    </v-app-bar>
    <v-main>
      <slot />
    </v-main>
    <v-bottom-navigation v-model="activeTab" color="primary">
      <v-btn v-for="tab in tabs" :key="tab.to" :to="tab.to" :value="tab.to">
        <v-icon>{{ tab.icon }}</v-icon>
        <span>{{ tab.label }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
  title: string
}>()

const route = useRoute()
const activeTab = computed(() => route.path)

const tabs = [
  { icon: 'mdi-home',    label: 'ホーム',       to: '/'          },
  { icon: 'mdi-magnify', label: '検索',         to: '/search'    },
  { icon: 'mdi-heart',   label: 'お気に入り',   to: '/favorites' },
  { icon: 'mdi-cog',     label: '設定',         to: '/settings'  },
]
</script>
