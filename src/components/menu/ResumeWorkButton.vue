<template>
  <div class="resume-work-wrapper">
    <v-btn
      :color="store.hasActiveSession ? 'secondary' : 'surface-variant'"
      variant="flat"
      rounded="xl"
      class="resume-work-btn"
      :disabled="!store.hasActiveSession"
      @click="onResume"
    >
      <div class="resume-work-btn__inner">
        <v-icon size="48">mdi-clipboard-play</v-icon>
        <span class="text-subtitle-1 font-weight-bold mt-2">{{ store.sessionLabel }}</span>
        <span v-if="store.hasActiveSession" class="text-caption mt-1 opacity-80">
          {{ store.sessionSubLabel }}
        </span>
      </div>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useWorkSessionStore } from '@/stores/workSessionStore'

const store = useWorkSessionStore()
const router = useRouter()

function onResume() {
  if (!store.currentSession) return
  router.push(store.currentSession.route)
}
</script>

<style scoped>
.resume-work-wrapper {
  padding: 0 24px 28px;
}
.resume-work-btn {
  width: 100%;
  min-height: 160px;
}
.resume-work-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
