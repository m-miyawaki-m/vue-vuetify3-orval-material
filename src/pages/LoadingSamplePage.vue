<template>
  <SubLayout title="ローディングサンプル">
    <v-container>
      <p class="text-body-2 mb-4">
        ボタンを押すと、処理中に全画面ローディング(グルグル)が自動で表示されることを確認できます。
      </p>
      <div class="d-flex flex-column ga-4">
        <v-btn color="primary" prepend-icon="mdi-download" @click="slowQuery.refetch()">
          遅い取得通信(2秒)
        </v-btn>
        <v-btn color="secondary" prepend-icon="mdi-upload" @click="slowMutation.mutate()">
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
import { useQuery, useMutation } from '@tanstack/vue-query'
import SubLayout from '@/components/layout/SubLayout.vue'
import { getProducts } from '@/api'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 遅い取得通信: 2秒待ってから orval 生成関数で実 API を叩く。
// enabled: false なので発火はボタンの refetch のみ。gcTime: 0 でキャッシュを残さない
const slowQuery = useQuery({
  queryKey: ['loading-sample', 'slow-fetch'],
  queryFn: async ({ signal }) => {
    await sleep(2000)
    return getProducts(undefined, undefined, signal)
  },
  enabled: false,
  gcTime: 0,
})

// 遅い更新通信: API を使わず 2 秒待つだけ(isMutating 経由の発火を確認する用)
const slowMutation = useMutation({
  mutationFn: () => sleep(2000),
})
</script>
