<template>
  <div class="phone-wrapper">
    <v-app :theme="themeStore.currentTheme" class="phone-app">
      <router-view />
    </v-app>
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
const themeStore = useThemeStore()
</script>

<style>
/* ── スマホ固定レイアウト（PC ブラウザ確認用） ── */
html, body {
  height: 100%;
  margin: 0;
}

/* PC 幅でのみ背景・センタリングを適用 */
@media (min-width: 480px) {
  body {
    background: #757575;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
}

.phone-wrapper {
  width: 100%;
  max-width: 430px;   /* 一般的な Android スマホ幅 */
  min-height: 100dvh;
  position: relative;
}

@media (min-width: 480px) {
  .phone-wrapper {
    min-height: 100vh;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
  }
}

/* v-app を wrapper に収める */
.phone-app {
  max-width: 430px !important;
}
</style>
