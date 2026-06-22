<template>
  <SubLayout title="準備中">
    <div class="d-flex flex-column align-center justify-center" style="height: 60dvh; gap: 24px;">
      <v-icon size="72" color="grey-lighten-1">mdi-wrench-clock</v-icon>
      <div class="text-center">
        <p class="text-h6 font-weight-medium mb-1">準備中</p>
        <p class="text-body-2 text-medium-emphasis">このページは現在準備中です。</p>
      </div>
      <v-btn color="primary" variant="elevated" prepend-icon="mdi-arrow-left" @click="router.push('/menu')">
        メニューに戻る
      </v-btn>
    </div>
  </SubLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import SubLayout from '@/components/layout/SubLayout.vue'

const router = useRouter()
</script>
