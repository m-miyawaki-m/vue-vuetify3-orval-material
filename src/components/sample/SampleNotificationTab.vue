<template>
  <v-container class="pb-8">

    <section class="mb-4">
      <p class="text-overline text-medium-emphasis mb-2">通知・オーバーレイパターン</p>

      <v-card variant="outlined" class="mb-4 pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">v-snackbar（トースト通知）</p>
        <p class="text-caption text-medium-emphasis mb-3">
          操作結果の短い通知。自動で消えます。コンテンツ入力には使いません。
        </p>
        <div class="d-flex gap-2 flex-wrap">
          <v-btn
            color="success"
            variant="tonal"
            size="small"
            prepend-icon="mdi-check-circle"
            @click="showSnack('success', '保存しました')"
          >成功</v-btn>
          <v-btn
            color="error"
            variant="tonal"
            size="small"
            prepend-icon="mdi-alert-circle"
            @click="showSnack('error', 'エラーが発生しました')"
          >エラー</v-btn>
          <v-btn
            color="info"
            variant="tonal"
            size="small"
            prepend-icon="mdi-information"
            @click="showSnack('info', '処理中です...')"
          >情報</v-btn>
        </div>
      </v-card>

      <v-card variant="outlined" class="pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">v-bottom-sheet（アクションシート）</p>
        <p class="text-caption text-medium-emphasis mb-3">
          画面下から出るオーバーレイ。スマホでの選択メニューやフィルタに最適。
        </p>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-menu-up" @click="bottomSheet = true">
          アクションシートを開く
        </v-btn>
        <p v-if="sheetResult" class="text-caption text-medium-emphasis mt-2">→ {{ sheetResult }}</p>
      </v-card>
    </section>

    <v-bottom-sheet v-model="bottomSheet">
      <v-card rounded="t-xl">
        <v-card-title class="pt-4">操作を選択</v-card-title>
        <v-list>
          <v-list-item prepend-icon="mdi-share-variant" title="共有する" @click="selectSheet('共有')" />
          <v-list-item prepend-icon="mdi-download" title="ダウンロード" @click="selectSheet('ダウンロード')" />
          <v-list-item
            prepend-icon="mdi-heart-outline"
            title="お気に入りに追加"
            @click="selectSheet('お気に入り追加')"
          />
          <v-divider />
          <v-list-item prepend-icon="mdi-delete" title="削除" color="error" @click="selectSheet('削除')" />
        </v-list>
        <div class="pa-4">
          <v-btn block variant="text" @click="bottomSheet = false">キャンセル</v-btn>
        </div>
      </v-card>
    </v-bottom-sheet>

  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSnackbar } from '@/composables/useSnackbar'

const { showSnack } = useSnackbar()

const bottomSheet = ref(false)
const sheetResult = ref('')

function selectSheet(label: string) {
  sheetResult.value = label
  bottomSheet.value = false
}
</script>
