<template>
  <SubLayout title="ローディングサンプル">
    <v-container>
      <p class="text-body-2 mb-4">
        ボタンを押すと、処理中に全画面ローディング(グルグル)が自動で表示されることを確認できます。
      </p>
      <div class="d-flex flex-column ga-4">
        <v-btn color="primary" prepend-icon="mdi-download" @click="runSlowFetch">
          遅い取得通信(2秒)
        </v-btn>
        <v-btn color="secondary" prepend-icon="mdi-upload" @click="runSlowMutation">
          遅い更新通信(2秒)
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-arrow-right" to="/menu">
          ページ遷移(メインメニューへ)
        </v-btn>
        <p class="text-caption text-medium-emphasis mb-0">
          ※ ページ遷移は開発環境では一瞬で終わるため、グルグルを体感できない場合があります。
        </p>
      </div>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import SubLayout from '@/components/layout/SubLayout.vue'
import { useLoadingSample } from '@/composables/queries/useLoadingSample'

const { runSlowFetch, runSlowMutation } = useLoadingSample()
</script>
