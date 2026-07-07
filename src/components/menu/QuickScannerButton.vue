<template>
  <div class="quick-scanner-wrapper">
    <v-btn
      color="primary"
      variant="flat"
      rounded="xl"
      class="quick-scanner-btn"
      @click="router.push('/quick-scan')"
    >
      <div class="quick-scanner-btn__inner">
        <v-icon size="48">mdi-barcode-scan</v-icon>
        <span class="text-subtitle-1 font-weight-bold mt-2">クイックスキャン</span>
      </div>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.quick-scanner-wrapper {
  padding: 0 24px 28px;
}
.quick-scanner-btn {
  width: 100%;
  min-height: 160px;
}
.quick-scanner-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
}
</style>
