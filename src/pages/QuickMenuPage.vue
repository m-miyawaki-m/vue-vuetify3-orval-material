<template>
  <MainLayout title="クイックメニュー">
    <MenuGrid />
    <QuickScannerButton />
    <ResumeWorkButton />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import MenuGrid from '@/components/menu/MenuGrid.vue'
import QuickScannerButton from '@/components/menu/QuickScannerButton.vue'
import ResumeWorkButton from '@/components/menu/ResumeWorkButton.vue'
</script>
