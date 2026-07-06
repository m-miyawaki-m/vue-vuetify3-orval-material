<template>
  <!--
    全画面ローディング(グルグル)。useGlobalLoading の観測結果を表示するだけで、
    このコンポーネント自身は表示/非表示を制御しない。
    - persistent + scrim: 表示中は背後の操作をブロック(二度押し防止を兼ねる)
    - contained: v-app(スマホ枠 430px)の内側だけを覆う(PC プレビューの灰色背景は覆わない)
    - z-index 3000: v-dialog(既定 2400)より手前に出す
  -->
  <v-overlay
    :model-value="isLoading"
    persistent
    contained
    no-click-animation
    :z-index="3000"
    class="align-center justify-center"
  >
    <v-progress-circular
      data-testid="global-loading"
      indeterminate
      color="primary"
      size="48"
    />
  </v-overlay>
</template>

<script setup lang="ts">
import { useGlobalLoading } from '@/composables/useGlobalLoading'
const { isLoading } = useGlobalLoading()
</script>
