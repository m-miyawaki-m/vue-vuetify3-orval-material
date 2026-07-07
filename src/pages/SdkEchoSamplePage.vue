<template>
  <SubLayout title="SDK エコーサンプル">
    <v-container>
      <p class="text-body-2 mb-4">
        入力した値を Capacitor プラグイン経由で SampleSdk に渡し、そのまま返ってくることを確認できます。
        Android 実機では Java の SDK を、ブラウザでは Web フォールバックを経由します。
      </p>
      <v-text-field v-model="input" label="SDK に渡す値" />
      <div class="d-flex ga-2 mb-4">
        <v-btn color="primary" prepend-icon="mdi-swap-horizontal" @click="sendSync">
          同期で送る
        </v-btn>
        <v-btn color="secondary" prepend-icon="mdi-bell-ring-outline" @click="sendAsync">
          イベントで送る
        </v-btn>
      </div>
      <v-card class="mb-2" variant="outlined">
        <v-card-text>同期結果: {{ syncResult || '—' }}</v-card-text>
      </v-card>
      <v-card variant="outlined">
        <v-card-text>イベント結果: {{ eventResult || '—' }}</v-card-text>
      </v-card>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import { SampleSdk } from '@/plugins/sampleSdk'

const input = ref('')
const syncResult = ref('')
const eventResult = ref('')

async function sendSync() {
  const { value } = await SampleSdk.echo({ value: input.value })
  syncResult.value = value
}

async function sendAsync() {
  eventResult.value = '（待機中…）'
  await SampleSdk.echoAsync({ value: input.value })
}

onMounted(async () => {
  await SampleSdk.addListener('echoResult', (data) => {
    eventResult.value = data.value
  })
})

onUnmounted(() => {
  SampleSdk.removeAllListeners()
})
</script>
