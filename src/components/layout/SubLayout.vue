<template>
  <v-layout style="height: 100dvh;">
    <v-app-bar color="primary" elevation="2">
      <template #prepend>
        <v-btn icon="mdi-arrow-left" @click="router.back()" />
      </template>
      <v-app-bar-title>{{ title }}</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <slot />
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
}>()

const router = useRouter()
</script>

<style scoped>
:deep(.v-main__wrap) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
</style>
