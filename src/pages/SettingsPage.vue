<template>
  <MainLayout title="設定">
    <v-container class="py-6">
      <SettingsThemePanel />

      <v-divider class="my-6" />

      <p class="text-overline text-medium-emphasis mb-3">メニューカスタマイズ</p>
      <MenuSettingsPanel />

      <v-divider class="my-6" />

      <p class="text-overline text-medium-emphasis mb-3">エラー履歴</p>
      <v-card variant="outlined">
        <v-card-text>
          <v-text-field
            v-model.number="settingsStore.errorHistoryLimit"
            label="エラー履歴の保持件数"
            type="number"
            suffix="件"
            :rules="[v => v >= 1 || '1以上を入力してください']"
            hide-details="auto"
            min="1"
            max="1000"
          />
        </v-card-text>
      </v-card>
    </v-container>
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import SettingsThemePanel from '@/components/settings/SettingsThemePanel.vue'
import MenuSettingsPanel from '@/components/menu/MenuSettingsPanel.vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()
</script>
