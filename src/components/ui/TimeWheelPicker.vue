<template>
  <div class="twp">
    <!-- フェードオーバーレイ（上下） -->
    <div class="twp__fade twp__fade--top" />
    <div class="twp__fade twp__fade--bottom" />
    <!-- 選択中アイテムのハイライトバー -->
    <div class="twp__bar" />

    <!-- 時（Hours） -->
    <div ref="hoursEl" class="twp__col" @scroll.passive="onHourScroll">
      <div v-for="i in 2" :key="'hs' + i" class="twp__cell" />
      <div
        v-for="h in 24"
        :key="'h' + h"
        class="twp__cell twp__cell--item"
        @click="jumpHour(h - 1)"
      >
        {{ pad(h - 1) }}
      </div>
      <div v-for="i in 2" :key="'he' + i" class="twp__cell" />
    </div>

    <span class="twp__colon">:</span>

    <!-- 分（Minutes） -->
    <div ref="minutesEl" class="twp__col" @scroll.passive="onMinuteScroll">
      <div v-for="i in 2" :key="'ms' + i" class="twp__cell" />
      <div
        v-for="m in 60"
        :key="'m' + m"
        class="twp__cell twp__cell--item"
        @click="jumpMinute(m - 1)"
      >
        {{ pad(m - 1) }}
      </div>
      <div v-for="i in 2" :key="'me' + i" class="twp__cell" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
  }>(),
  { modelValue: null }
)

const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const ITEM_H = 44 // 1セルの高さ (px)

const hoursEl = ref<HTMLElement | null>(null)
const minutesEl = ref<HTMLElement | null>(null)
const hour = ref(0)
const minute = ref(0)

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function parseValue(v: string | null | undefined) {
  if (!v) return { h: 0, m: 0 }
  const [h, m] = v.split(':').map(Number)
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m }
}

function scrollTo(el: HTMLElement, idx: number, smooth = false) {
  el.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'instant' })
}

onMounted(() => {
  const { h, m } = parseValue(props.modelValue)
  hour.value = h
  minute.value = m
  if (hoursEl.value) scrollTo(hoursEl.value, h)
  if (minutesEl.value) scrollTo(minutesEl.value, m)
})

watch(
  () => props.modelValue,
  (v) => {
    const { h, m } = parseValue(v)
    hour.value = h
    minute.value = m
    if (hoursEl.value) scrollTo(hoursEl.value, h, true)
    if (minutesEl.value) scrollTo(minutesEl.value, m, true)
  }
)

function emitValue() {
  emit('update:modelValue', `${pad(hour.value)}:${pad(minute.value)}`)
}

// スクロール後にスナップ位置に補正し値を確定
let hourTimer: ReturnType<typeof setTimeout>
function onHourScroll() {
  clearTimeout(hourTimer)
  hourTimer = setTimeout(() => {
    const idx = Math.max(0, Math.min(23, Math.round(hoursEl.value!.scrollTop / ITEM_H)))
    hour.value = idx
    scrollTo(hoursEl.value!, idx, true)
    emitValue()
  }, 120)
}

let minTimer: ReturnType<typeof setTimeout>
function onMinuteScroll() {
  clearTimeout(minTimer)
  minTimer = setTimeout(() => {
    const idx = Math.max(0, Math.min(59, Math.round(minutesEl.value!.scrollTop / ITEM_H)))
    minute.value = idx
    scrollTo(minutesEl.value!, idx, true)
    emitValue()
  }, 120)
}

// アイテムをタップして直接ジャンプ
function jumpHour(idx: number) {
  hour.value = idx
  scrollTo(hoursEl.value!, idx, true)
  emitValue()
}

function jumpMinute(idx: number) {
  minute.value = idx
  scrollTo(minutesEl.value!, idx, true)
  emitValue()
}
</script>

<style scoped>
.twp {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px; /* ITEM_H × 5 = 44 × 5 */
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* スクロール列 */
.twp__col {
  width: 80px;
  height: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior: contain;
}
.twp__col::-webkit-scrollbar {
  display: none;
}

/* 各セル */
.twp__cell {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
  font-size: 1.5rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.85);
}
.twp__cell--item {
  cursor: pointer;
  transition: color 0.15s;
}

/* コロン区切り */
.twp__colon {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 6px;
  line-height: 1;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

/* 選択中ハイライトバー */
.twp__bar {
  position: absolute;
  inset: 0;
  top: calc(50% - 22px);
  height: 44px;
  border-top: 1.5px solid rgba(var(--v-theme-on-surface), 0.15);
  border-bottom: 1.5px solid rgba(var(--v-theme-on-surface), 0.15);
  pointer-events: none;
  z-index: 1;
}

/* 上下フェード */
.twp__fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 88px;
  z-index: 2;
  pointer-events: none;
}
.twp__fade--top {
  top: 0;
  background: linear-gradient(to bottom, rgba(var(--v-theme-surface), 0.95) 20%, transparent);
}
.twp__fade--bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(var(--v-theme-surface), 0.95) 20%, transparent);
}
</style>
