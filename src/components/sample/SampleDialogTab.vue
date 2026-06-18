<template>
  <v-container class="pb-8">

    <section class="mb-8">
      <p class="text-overline text-medium-emphasis mb-2">ダイアログパターン</p>
      <p class="text-caption text-medium-emphasis mb-4">
        用途に応じて使い分けます。すべてユーザーの注意を集中させる目的で使います。
      </p>
      <div class="d-flex flex-column gap-3">

        <v-card variant="outlined" class="pa-4">
          <p class="text-subtitle-2 font-weight-bold mb-1">情報ダイアログ</p>
          <p class="text-caption text-medium-emphasis mb-3">メッセージの提示・内容の確認。閉じるボタンのみ。</p>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-information" @click="infoDialog = true">
            情報を表示
          </v-btn>
        </v-card>

        <v-card variant="outlined" class="pa-4">
          <p class="text-subtitle-2 font-weight-bold mb-1">確認ダイアログ（ConfirmDialog）</p>
          <p class="text-caption text-medium-emphasis mb-3">OK / キャンセルで分岐。削除・送信前の確認に。</p>
          <v-btn color="error" variant="tonal" prepend-icon="mdi-delete" @click="confirmDialog = true">
            削除の確認
          </v-btn>
          <p v-if="confirmResult" class="text-caption text-medium-emphasis mt-2">→ {{ confirmResult }}</p>
        </v-card>

        <v-card variant="outlined" class="pa-4">
          <p class="text-subtitle-2 font-weight-bold mb-1">フォームダイアログ</p>
          <p class="text-caption text-medium-emphasis mb-3">入力フォームを内包。新規作成・編集に使います。</p>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="formDialog = true">
            新規追加
          </v-btn>
          <p v-if="formResult" class="text-caption text-medium-emphasis mt-2">→ 登録: {{ formResult }}</p>
        </v-card>

        <v-card variant="outlined" class="pa-4">
          <p class="text-subtitle-2 font-weight-bold mb-1">フルスクリーンダイアログ</p>
          <p class="text-caption text-medium-emphasis mb-3">画面全体を占有。複雑な編集フォームや詳細ページに。</p>
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-fullscreen"
            @click="fullscreenDialog = true"
          >
            フルスクリーンで開く
          </v-btn>
        </v-card>

      </div>
    </section>

    <!-- 情報ダイアログ -->
    <BaseDialog v-model="infoDialog" title="お知らせ">
      <p class="text-body-2">この操作は取り消せません。</p>
      <p class="text-body-2 mt-2">詳細については利用規約をご確認ください。</p>
      <template #actions>
        <v-spacer />
        <v-btn color="primary" variant="elevated" @click="infoDialog = false">閉じる</v-btn>
      </template>
    </BaseDialog>

    <!-- 確認ダイアログ -->
    <ConfirmDialog
      v-model="confirmDialog"
      title="削除の確認"
      message="このアイテムを削除しますか？この操作は取り消せません。"
      @confirm="onConfirmOk"
      @cancel="onConfirmCancel"
    />

    <!-- フォームダイアログ -->
    <BaseDialog v-model="formDialog" title="新規アイテムを追加" max-width="440px">
      <v-text-field v-model="formName" label="名前" variant="outlined" density="compact" class="mb-3" />
      <v-text-field v-model="formEmail" label="メール" variant="outlined" density="compact" type="email" />
      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="cancelForm">キャンセル</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!formName || !formEmail"
          @click="submitForm"
        >登録</v-btn>
      </template>
    </BaseDialog>

    <!-- フルスクリーンダイアログ -->
    <v-dialog v-model="fullscreenDialog" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar color="primary" elevation="0">
          <template #prepend>
            <v-btn icon="mdi-close" @click="fullscreenDialog = false" />
          </template>
          <v-toolbar-title>フルスクリーン編集</v-toolbar-title>
          <template #append>
            <v-btn variant="text" @click="fullscreenDialog = false">保存</v-btn>
          </template>
        </v-toolbar>
        <v-container class="pt-6">
          <v-text-field label="タイトル" variant="outlined" class="mb-4" />
          <v-textarea label="本文" variant="outlined" rows="6" />
        </v-container>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseDialog from '@/components/dialog/BaseDialog.vue'
import ConfirmDialog from '@/components/dialog/ConfirmDialog.vue'

const infoDialog = ref(false)
const confirmDialog = ref(false)
const confirmResult = ref('')
const formDialog = ref(false)
const formResult = ref('')
const formName = ref('')
const formEmail = ref('')
const fullscreenDialog = ref(false)

function onConfirmOk() {
  confirmResult.value = 'OK を選択'
  confirmDialog.value = false
}
function onConfirmCancel() {
  confirmResult.value = 'キャンセルを選択'
  confirmDialog.value = false
}
function cancelForm() {
  formDialog.value = false
  formName.value = ''
  formEmail.value = ''
}
function submitForm() {
  formResult.value = `${formName.value} / ${formEmail.value}`
  cancelForm()
}
</script>
