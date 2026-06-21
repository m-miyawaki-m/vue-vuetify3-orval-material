<template>
  <v-layout style="height: 100dvh; overflow: hidden">
    <v-app-bar color="primary" elevation="2">
      <template #prepend>
        <v-btn icon="mdi-arrow-left" @click="router.back()" />
      </template>
      <v-app-bar-title>{{ title }}</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <div class="sub-scroll">
        <slot />
      </div>
    </v-main>

    <v-bottom-navigation v-if="$slots.footer">
      <slot name="footer" />
    </v-bottom-navigation>
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
.sub-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

:deep(.v-main__wrap) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
