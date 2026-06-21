<template>
  <v-container class="pb-8">
    <section class="mb-8">
      <p class="text-overline text-medium-emphasis mb-2">表示制御パターン</p>

      <v-card variant="outlined" class="mb-4 pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">v-if — 条件付きレンダリング</p>
        <p class="text-caption text-medium-emphasis mb-3">
          条件が false のとき DOM から完全に除去されます。追加入力欄の出し入れなどに最適。
        </p>
        <v-checkbox
          v-model="showExtra"
          label="追加情報を入力する"
          color="primary"
          hide-details
          class="mb-2"
        />
        <v-expand-transition>
          <div v-if="showExtra">
            <v-text-field label="会社名" variant="outlined" density="compact" class="mb-2" />
            <v-text-field label="部署名" variant="outlined" density="compact" />
          </div>
        </v-expand-transition>
      </v-card>

      <v-card variant="outlined" class="mb-4 pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">v-show — 表示/非表示切り替え</p>
        <p class="text-caption text-medium-emphasis mb-3">
          DOM は残り visibility/display だけ切り替えます。頻繁に開閉する場合は v-if より高速。
        </p>
        <v-btn
          :prepend-icon="showDetail ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          variant="tonal"
          color="primary"
          size="small"
          class="mb-2"
          @click="showDetail = !showDetail"
          >{{ showDetail ? '詳細を隠す' : '詳細を表示' }}</v-btn
        >
        <div v-show="showDetail" class="pa-3 rounded bg-grey-lighten-4">
          <p class="text-body-2">v-show で表示制御されたコンテンツです。</p>
          <p class="text-body-2">DOM に残るため再表示が速いです。</p>
        </div>
      </v-card>

      <v-card variant="outlined" class="pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">v-menu — ポップアップメニュー</p>
        <p class="text-caption text-medium-emphasis mb-3">
          ボタン近くに小さいドロップダウンを出します。コンテキストメニューや操作メニューに使います。
        </p>
        <div class="d-flex align-center gap-3">
          <span class="text-body-2">操作対象アイテム</span>
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn icon="mdi-dots-vertical" variant="text" v-bind="menuProps" />
            </template>
            <v-list density="compact">
              <v-list-item
                prepend-icon="mdi-pencil"
                title="編集"
                @click="menuResult = '編集を選択'"
              />
              <v-list-item
                prepend-icon="mdi-content-copy"
                title="コピー"
                @click="menuResult = 'コピーを選択'"
              />
              <v-divider />
              <v-list-item
                prepend-icon="mdi-delete"
                title="削除"
                color="error"
                @click="menuResult = '削除を選択'"
              />
            </v-list>
          </v-menu>
        </div>
        <p v-if="menuResult" class="text-caption text-medium-emphasis mt-2">→ {{ menuResult }}</p>
      </v-card>
    </section>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showExtra = ref(false)
const showDetail = ref(false)
const menuResult = ref('')
</script>
