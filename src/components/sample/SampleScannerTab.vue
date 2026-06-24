<template>
  <v-container class="pb-8">
    <section class="mb-8">
      <p class="text-overline text-medium-emphasis mb-2">バーコード スキャナー</p>
      <p class="text-caption text-medium-emphasis mb-4">
        カメラを使ってバーコード・QRコードをリアルタイムで読み取ります。
        <code>npm run dev</code> のブラウザ環境でもWebカメラで動作確認できます。
      </p>

      <!-- BarcodeInputField -->
      <v-card variant="outlined" class="mb-4 pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">フォーム入力補助（BarcodeInputField）</p>
        <p class="text-caption text-medium-emphasis mb-3">
          テキストフィールド右端のアイコンをタップするとカメラが起動します。
          読み取ったコードが自動入力されます。
        </p>
        <BarcodeInputField
          v-model="scannedCode"
          label="バーコード / QR"
          variant="outlined"
          clearable
        />
        <p v-if="scannedCode" class="text-caption text-medium-emphasis mt-1">
          入力値: {{ scannedCode }}
        </p>
      </v-card>

      <!-- ScanListPage デモ -->
      <v-card variant="outlined" class="mb-4 pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">連続スキャン＋リスト（ScanListPage）</p>
        <p class="text-caption text-medium-emphasis mb-3">
          複数のコードを続けて読み取り、リスト確認後に一括返却します。
        </p>
        <div class="d-flex align-center gap-3 mb-3">
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-barcode-scan"
            @click="openScanList"
          >連続スキャン（新）</v-btn>
          <v-btn
            v-if="scanListRows.length"
            variant="text"
            color="error"
            size="small"
            @click="scanListRows = []"
          >クリア</v-btn>
        </div>
        <v-data-table
          v-if="scanListRows.length"
          :headers="listHeaders"
          :items="scanListItems"
          density="compact"
          class="elevation-0"
        />
        <p v-else class="text-caption text-medium-emphasis">スキャン結果がここに表示されます。</p>
      </v-card>

      <!-- ScanModePage デモ -->
      <v-card variant="outlined" class="mb-4 pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">モード切替読み取り（ScanModePage）</p>
        <p class="text-caption text-medium-emphasis mb-3">
          バーコード / QR / OCR をタブで切り替えて単発読み取りができます。
        </p>
        <div class="d-flex align-center gap-3 mb-3">
          <v-btn
            color="teal"
            variant="tonal"
            prepend-icon="mdi-qrcode-scan"
            @click="openScanMode('barcode')"
          >バーコード</v-btn>
          <v-btn
            color="teal"
            variant="tonal"
            prepend-icon="mdi-qrcode"
            @click="openScanMode('qr')"
          >QR</v-btn>
        </div>
        <p v-if="scanModeResult" class="text-caption text-medium-emphasis mt-1">
          読み取り値: <strong>{{ scanModeResult }}</strong>
        </p>
        <p v-else class="text-caption text-medium-emphasis">読み取り結果がここに表示されます。</p>
      </v-card>

      <!-- 旧: 連続スキャン -->
      <v-card variant="outlined" class="pa-4">
        <p class="text-subtitle-2 font-weight-bold mb-1">
          連続スキャン → テーブル追加（旧 ScannerPage）
        </p>
        <p class="text-caption text-medium-emphasis mb-3">
          「連続スキャン」ボタンで複数のコードを続けて読み取り、完了するとテーブルに一括追加します。
        </p>
        <div class="d-flex align-center gap-3 mb-3">
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-barcode-scan"
            @click="scannerStore.requestScan('continuous', (r) => scanTableRows.push(...r))"
          >連続スキャン（旧）</v-btn>
          <v-btn
            v-if="scanTableRows.length"
            variant="text"
            color="error"
            size="small"
            @click="scanTableRows = []"
          >テーブルクリア</v-btn>
        </div>
        <v-data-table
          v-if="scanTableRows.length"
          :headers="tableHeaders"
          :items="tableItems"
          density="compact"
          class="elevation-0"
        />
        <p v-else class="text-caption text-medium-emphasis">スキャン結果がここに表示されます。</p>
      </v-card>
    </section>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BarcodeInputField from '@/components/scanner/BarcodeInputField.vue'
import { useScannerStore } from '@/stores/scannerStore'
import { useScanListStore } from '@/stores/scanListStore'
import { useScanModeStore } from '@/stores/scanModeStore'
import type { ScanResult } from '@/types/scanner'
import type { ScanListItem } from '@/types/scanList'
import type { ScanMode } from '@/types/scanMode'

const scannerStore = useScannerStore()
const scanListStore = useScanListStore()
const scanModeStore = useScanModeStore()

const scannedCode = ref('')
const scanTableRows = ref<ScanResult[]>([])
const scanListRows = ref<ScanListItem[]>([])
const scanModeResult = ref('')

function openScanList() {
  scanListStore.requestScanList({
    title: '連続スキャン デモ',
    confirmLabel: '確定',
    onConfirm: (items) => { scanListRows.value = items },
  })
}

function openScanMode(defaultMode: ScanMode) {
  scanModeStore.requestScan({
    title: 'モード切替 デモ',
    defaultMode,
    onConfirm: (raw) => { scanModeResult.value = raw },
  })
}

const listHeaders = [
  { title: '読み取り値', key: 'raw' },
  { title: 'フォーマット', key: 'format' },
  { title: '時刻', key: 'timestamp' },
]

const scanListItems = computed(() =>
  scanListRows.value.map((r) => ({
    raw: r.raw,
    format: r.format,
    timestamp: new Date(r.timestamp).toLocaleTimeString(),
  }))
)

const tableHeaders = [
  { title: '読み取り値', key: 'text' },
  { title: 'フォーマット', key: 'format' },
  { title: '時刻', key: 'timestamp' },
]

const tableItems = computed(() =>
  scanTableRows.value.map((r) => ({
    text: r.text,
    format: r.format,
    timestamp: new Date(r.timestamp).toLocaleTimeString(),
  }))
)
</script>
