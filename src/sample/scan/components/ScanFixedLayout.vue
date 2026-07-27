<template>
  <SubLayout :title="title">
    <div class="scan-fixed">
      <slot />
    </div>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </SubLayout>
</template>

<script setup lang="ts">
import SubLayout from '@/components/layout/SubLayout.vue'

defineProps<{ title: string }>()
</script>

<style scoped>
/* ページ全体はスクロールさせず、内側(リスト等)だけがスクロールする */
.scan-fixed {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
