<template>
  <SubLayout title="スキャンパターン集">
    <v-container>
      <p class="text-caption text-medium-emphasis mb-4">
        読み取りモード(単発/連続)× 値の加工(そのまま/分割)× 解決(そのまま/API照会)の
        組み合わせパターン集です。部品とロジックの組み合わせだけで画面を構成しています。
      </p>
      <v-card
        v-for="p in SCAN_PATTERNS"
        :key="p.id"
        class="mb-3"
        variant="outlined"
        :to="p.scanPath"
      >
        <v-card-text class="d-flex align-center">
          <v-icon :icon="p.icon" size="32" color="primary" class="mr-4" />
          <div>
            <p class="text-subtitle-2 font-weight-bold">{{ p.title }}</p>
            <p class="text-caption text-medium-emphasis">{{ p.description }}</p>
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import SubLayout from '@/components/layout/SubLayout.vue'
import { SCAN_PATTERNS } from '../logic/patterns'
</script>
