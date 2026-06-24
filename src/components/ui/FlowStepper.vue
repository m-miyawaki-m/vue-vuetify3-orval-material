<template>
  <div class="flow-stepper">
    <template v-for="(label, i) in steps" :key="i">
      <div
        class="step-item"
        :class="{
          'step-done': isDone(i + 1),
          'step-current': isCurrent(i + 1),
          'step-future': isFuture(i + 1),
        }"
      >
        <div class="step-circle">
          <v-icon v-if="isDone(i + 1)" size="12" color="white">mdi-check</v-icon>
          <span v-else class="step-num">{{ i + 1 }}</span>
        </div>
        <span class="step-label">{{ label }}</span>
      </div>
      <div
        v-if="i < steps.length - 1"
        class="step-line"
        :class="isDone(i + 1) ? 'line-done' : 'line-future'"
      />
    </template>
  </div>
  <v-divider />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    step: number
    steps?: string[]
  }>(),
  { steps: () => ['検索', '一覧', '詳細'] },
)

const isDone    = (n: number) => n < props.step
const isCurrent = (n: number) => n === props.step
const isFuture  = (n: number) => n > props.step
</script>

<style scoped>
.flow-stepper {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  height: 40px;
  background: rgb(var(--v-theme-background));
}

.step-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.step-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-done .step-circle,
.step-current .step-circle {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.step-future .step-circle {
  border: 2px solid rgba(var(--v-theme-on-surface), 0.24);
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.step-num {
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
}

.step-label {
  font-size: 12px;
  white-space: nowrap;
}

.step-current .step-label {
  font-weight: bold;
}

.step-future .step-label {
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.step-line {
  flex: 1;
  height: 2px;
  min-width: 12px;
}

.line-done   { background: rgb(var(--v-theme-primary)); }
.line-future { background: rgba(var(--v-theme-on-surface), 0.12); }
</style>
