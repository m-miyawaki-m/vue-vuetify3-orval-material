<template>
  <MainLayout title="メインメニュー">
    <v-container class="py-4">
      <v-progress-linear v-if="isLoading" indeterminate color="primary" class="mb-4" />
      <div v-if="isError" class="mb-4">
        <v-chip color="warning" variant="tonal" size="small" prepend-icon="mdi-wifi-off">
          オフラインモード（ローカルデータ）
        </v-chip>
      </div>
      <div v-if="!isLoading" class="menu-grid">
        <div v-for="item in items" :key="item.id" class="menu-item" @click="openSubMenu(item)">
          <v-icon size="40" color="primary">{{ item.icon }}</v-icon>
          <span class="text-body-2 font-weight-medium mt-1">{{ item.label }}</span>
        </div>
      </div>
    </v-container>

    <!-- サブメニュー（ボトムシート） -->
    <v-bottom-sheet v-model="sheet">
      <v-card rounded="t-xl">
        <v-card-title class="pt-5 px-5 pb-1 text-h6">
          <v-icon class="mr-2" color="primary">{{ activeItem?.icon }}</v-icon>
          {{ activeItem?.label }}
        </v-card-title>
        <v-list lines="one">
          <v-list-item
            v-for="child in activeItem?.children"
            :key="child.to"
            :prepend-icon="child.icon ?? 'mdi-chevron-right'"
            :title="child.label"
            @click="navigate(child.to)"
          />
        </v-list>
        <div class="pa-4 pt-2">
          <v-btn block variant="text" @click="sheet = false">閉じる</v-btn>
        </div>
      </v-card>
    </v-bottom-sheet>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useGetMenu } from '@/api/index'
import type { MenuItem } from '@/api/index'
import { GetMenuResponse } from '@/api/index.zod'
import fallbackData from '@/data/main-menu.json'

const fallback: MenuItem[] = GetMenuResponse.parse(fallbackData)

const router = useRouter()
const sheet = ref(false)
const activeItem = ref<MenuItem | null>(null)

const { data, isLoading, isError } = useGetMenu()

// エラー時はローカル JSON にフォールバック（オフラインモード）
const items = computed<MenuItem[]>(() =>
  isError.value ? fallback : (data.value ?? []),
)

function openSubMenu(item: MenuItem) {
  activeItem.value = item
  sheet.value = true
}

function navigate(to: string) {
  sheet.value = false
  router.push(to)
}
</script>

<style scoped>
.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
  cursor: pointer;
  gap: 4px;
  transition: background 0.15s;
}

.menu-item:active {
  background: rgba(var(--v-theme-primary), 0.18);
}
</style>
