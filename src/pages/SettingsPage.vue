<template>
  <MainLayout title="設定">
    <v-container class="py-6">
      <SettingsThemePanel />
      <v-divider class="my-6" />
      <p class="text-overline text-medium-emphasis mb-3">メニューカスタマイズ</p>
      <MenuSettingsPanel />
    </v-container>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import SettingsThemePanel from '@/components/settings/SettingsThemePanel.vue'
import MenuSettingsPanel from '@/components/menu/MenuSettingsPanel.vue'
</script>
