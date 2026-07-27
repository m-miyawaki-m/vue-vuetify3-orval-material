<template>
  <ScanFixedLayout :title="`${title} - 結果`">
    <div class="pa-4">
      <p class="text-caption text-medium-emphasis mb-3" style="word-break: break-all">
        読取値: {{ single?.raw }}
      </p>
      <v-text-field
        v-for="f in fields"
        :key="f.key"
        v-model="values[f.key]"
        :label="f.label"
        variant="outlined"
        density="compact"
        class="mb-2"
      />
    </div>
    <template #footer>
      <v-btn @click="rescan">再スキャン</v-btn>
      <v-btn color="primary" :disabled="!single" @click="confirm">確定</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import { getPattern } from '../logic/patterns'
import { useResultScreen } from '../logic/useResultScreen'

const { single, fields, rescan, confirm, title } = useResultScreen(getPattern('single-split'))

// 分割結果をフォーム初期値として展開(ユーザーが手修正できるようローカルコピー)
const values = reactive<Record<string, string>>({ ...(single.value?.fields ?? {}) })
</script>
