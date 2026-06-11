# バーコード／QRコードスキャナー Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vue3 + Vuetify4 + Capacitor7 (Android) アプリに、バーコード・QRコードのカメラリアルタイム読み取り機能を追加する。フォーム入力補助用 `BarcodeInputField` と連続スキャン→テーブル追加用 `BarcodeScannerOverlay` の2コンポーネントを提供する。

**Architecture:** `useBarcodeScanner` composable が `@zxing/browser` の `BrowserMultiFormatReader` をラップし camera stream を管理する。`BarcodeScannerOverlay`（`v-overlay` フルスクリーン）は single / continuous 両モードを props で切り替え、continuous では完了時に `ScanResult[]` を emit してテーブル追加に使う。`BarcodeInputField` は `v-text-field` + スキャンボタンで内部に single モードの `BarcodeScannerOverlay` を持つ。`@zxing/browser` は WebRTC `getUserMedia` ベースのため `npm run dev` ブラウザでそのままテスト可能。

**Tech Stack:** Vue 3, TypeScript, Vuetify 4, `@zxing/browser`, WebRTC getUserMedia

---

## ファイル構成

| ファイル | 操作 | 責務 |
|---------|------|------|
| `package.json` | 修正 | `@zxing/browser` 追加 |
| `src/types/scanner.ts` | **新規** | `ScanResult` 型・`BarcodeFormat` 再エクスポート |
| `src/composables/useBarcodeScanner.ts` | **新規** | ZXing ラッパー composable（start/stop/torch） |
| `src/components/scanner/BarcodeScannerOverlay.vue` | **新規** | フルスクリーン v-overlay（single / continuous） |
| `src/components/scanner/BarcodeInputField.vue` | **新規** | v-text-field + スキャンボタン（single 専用） |
| `src/pages/ComponentSamplePage.vue` | 修正 | ⑩ バーコードスキャナーセクション追加 |

---

### Task 1: `@zxing/browser` インストール

**Files:**
- Modify: `package.json`

- [ ] **Step 1: パッケージをインストール**

```bash
npm install @zxing/browser
```

- [ ] **Step 2: インストール確認**

```bash
node -e "const b = require('@zxing/browser'); console.log('ok', typeof b.BrowserMultiFormatReader)"
```

期待出力: `ok function`

- [ ] **Step 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "chore: add @zxing/browser for barcode/QR scanning"
```

---

### Task 2: 型定義（`src/types/scanner.ts`）

**Files:**
- Create: `src/types/scanner.ts`

- [ ] **Step 1: ファイル作成**

`src/types/scanner.ts`:
```ts
import type { BarcodeFormat } from '@zxing/browser'

export type { BarcodeFormat }

export interface ScanResult {
  text: string      // 読み取り結果文字列
  format: string    // BarcodeFormat 名（例: 'QR_CODE', 'EAN_13', 'CODE_128'）
  timestamp: number // Date.now()
}
```

- [ ] **Step 2: TypeScript コンパイル確認**

```bash
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/types/scanner.ts
git commit -m "feat: add ScanResult type for barcode scanner"
```

---

### Task 3: `useBarcodeScanner` composable（`src/composables/useBarcodeScanner.ts`）

**Files:**
- Create: `src/composables/useBarcodeScanner.ts`

- [ ] **Step 1: composable ファイルを作成**

`src/composables/useBarcodeScanner.ts`:
```ts
import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { ScanResult } from '@/types/scanner'

const SCAN_COOLDOWN_MS = 1500

interface ScannerControls {
  stop(error?: Error): void
  switchTorch?(on: boolean): Promise<void>
}

export function useBarcodeScanner(
  videoRef: Ref<HTMLVideoElement | null>,
  options: { onScan: (result: ScanResult) => void }
) {
  const isScanning = ref(false)
  const error = ref<string | null>(null)
  const torchAvailable = ref(false)
  let controls: ScannerControls | null = null
  let lastScanText = ''
  let lastScanTime = 0

  async function start() {
    if (!videoRef.value) return
    error.value = null
    try {
      const reader = new BrowserMultiFormatReader()
      controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.value,
        (result) => {
          if (!result) return
          const now = Date.now()
          const text = result.getText()
          if (text === lastScanText && now - lastScanTime < SCAN_COOLDOWN_MS) return
          lastScanText = text
          lastScanTime = now
          // BarcodeFormat は数値 enum。逆引きで名前文字列を取得する
          const fmtNum = result.getBarcodeFormat() as number
          const fmtName: string = (BrowserMultiFormatReader as any).BarcodeFormat?.[fmtNum]
            ?? String(fmtNum)
          options.onScan({ text, format: fmtName, timestamp: now })
        }
      ) as ScannerControls
      isScanning.value = true
      torchAvailable.value = typeof controls.switchTorch === 'function'
    } catch (e) {
      if (e instanceof Error) {
        error.value =
          e.name === 'NotAllowedError' ? 'カメラへのアクセスが拒否されました。設定から許可してください。' :
          e.name === 'NotFoundError'   ? 'カメラが見つかりません。' :
                                         'カメラの起動に失敗しました。'
      }
    }
  }

  function stop() {
    controls?.stop()
    controls = null
    isScanning.value = false
  }

  async function switchTorch(on: boolean) {
    await controls?.switchTorch?.(on)
  }

  onUnmounted(stop)

  return { start, stop, isScanning, error, torchAvailable, switchTorch }
}
```

> **Note:** `BarcodeFormat` の逆引きは `@zxing/library` からの import でより安全にできる。もし `fmtName` が数字文字列になる場合は下記に差し替え:
> ```ts
> import { BarcodeFormat } from '@zxing/browser'
> const fmtName = BarcodeFormat[result.getBarcodeFormat() as number] ?? String(fmtNum)
> ```

- [ ] **Step 2: TypeScript コンパイル確認**

```bash
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/composables/useBarcodeScanner.ts
git commit -m "feat: add useBarcodeScanner composable wrapping @zxing/browser"
```

---

### Task 4: `BarcodeScannerOverlay.vue`

**Files:**
- Create: `src/components/scanner/BarcodeScannerOverlay.vue`

- [ ] **Step 1: コンポーネントファイルを作成**

`src/components/scanner/BarcodeScannerOverlay.vue`:
```vue
<template>
  <v-overlay
    v-model="model"
    :scrim="false"
    persistent
    class="align-start justify-start"
    style="z-index: 300;"
  >
    <div
      class="d-flex flex-column"
      style="width: 100vw; height: 100dvh; background: #000; overflow: hidden;"
    >
      <!-- ツールバー -->
      <div
        class="d-flex align-center px-3"
        style="height: 52px; background: rgba(0,0,0,0.75); flex-shrink: 0;"
      >
        <v-btn icon variant="text" color="white" size="small" @click="onCancel">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="flex-1-1 text-center text-white text-body-1 font-weight-bold">
          {{ title }}
        </span>
        <v-btn
          icon
          variant="text"
          :color="torchOn ? 'yellow-darken-1' : 'white'"
          size="small"
          :disabled="!torchAvailable"
          @click="onToggleTorch"
        >
          <v-icon>{{ torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight' }}</v-icon>
        </v-btn>
      </div>

      <!-- カメラエリア -->
      <div
        class="position-relative d-flex align-center justify-center"
        :style="cameraAreaStyle"
      >
        <video
          ref="videoRef"
          muted
          playsinline
          style="width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0;"
        />
        <!-- スキャン枠 -->
        <div class="scanner-frame" aria-hidden="true">
          <div class="corner tl" />
          <div class="corner tr" />
          <div class="corner bl" />
          <div class="corner br" />
          <div class="scanline" />
        </div>
        <!-- エラー表示 -->
        <div
          v-if="error"
          class="d-flex flex-column align-center justify-center pa-4"
          style="position: absolute; inset: 0; background: rgba(0,0,0,0.85); z-index: 2;"
        >
          <v-icon color="error" size="52">mdi-camera-off</v-icon>
          <p class="text-white text-center mt-4 text-body-2">{{ error }}</p>
        </div>
      </div>

      <!-- continuous モード: 履歴リスト -->
      <template v-if="mode === 'continuous'">
        <div style="flex: 1; overflow-y: auto; background: #111;">
          <p class="text-caption text-medium-emphasis pa-2 pb-1">
            スキャン済み（{{ results.length }}件）
          </p>
          <v-list density="compact" bg-color="transparent">
            <v-list-item
              v-for="(item, i) in results"
              :key="i"
              :title="item.text"
              :subtitle="item.format"
            >
              <template #append>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="white"
                  @click="results.splice(i, 1)"
                >
                  <v-icon size="16">mdi-close</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
        <!-- アクションバー -->
        <div
          class="d-flex align-center gap-2 pa-2"
          style="background: rgba(0,0,0,0.85); flex-shrink: 0;"
        >
          <v-btn
            color="error"
            variant="text"
            size="small"
            prepend-icon="mdi-delete-outline"
            @click="results = []"
          >クリア</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            style="flex: 1;"
            @click="onComplete"
          >完了（{{ results.length }}件）</v-btn>
        </div>
      </template>
    </div>
  </v-overlay>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanResult } from '@/types/scanner'

const props = withDefaults(defineProps<{
  mode: 'single' | 'continuous'
  title?: string
}>(), {
  title: 'バーコード スキャン',
})

const emit = defineEmits<{
  scan: [result: ScanResult]
  complete: [results: ScanResult[]]
}>()

const model = defineModel<boolean>()
const videoRef = ref<HTMLVideoElement | null>(null)
const results = ref<ScanResult[]>([])
const torchOn = ref(false)

const { start, stop, error, torchAvailable, switchTorch } = useBarcodeScanner(videoRef, {
  onScan(result) {
    emit('scan', result)
    if (props.mode === 'continuous') {
      results.value.push(result)
    } else {
      // single: 読み取り完了 → 自動クローズ（stop は watch の else 節で呼ばれる）
      model.value = false
    }
  },
})

const cameraAreaStyle = computed(() => ({
  height: props.mode === 'continuous' ? '45%' : 'calc(100dvh - 52px)',
  flexShrink: '0',
}))

watch(model, async (open) => {
  if (open) {
    results.value = []
    torchOn.value = false
    await nextTick()
    await start()
  } else {
    stop()
  }
})

function onCancel() {
  model.value = false
}

function onComplete() {
  emit('complete', [...results.value])
  model.value = false
}

async function onToggleTorch() {
  torchOn.value = !torchOn.value
  await switchTorch(torchOn.value)
}
</script>

<style scoped>
.scanner-frame {
  position: absolute;
  width: 230px;
  height: 230px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
}

.corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border-color: #00e676;
  border-style: solid;
}
.corner.tl { top: 0;    left: 0;  border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
.corner.tr { top: 0;    right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0; left: 0;  border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

.scanline {
  position: absolute;
  left: 12px;
  right: 12px;
  height: 2px;
  background: linear-gradient(to right, transparent, #00e676, transparent);
  box-shadow: 0 0 6px #00e676;
  animation: scanline 1.8s ease-in-out infinite;
}

@keyframes scanline {
  0%, 100% { top: 14px; }
  50%       { top: calc(100% - 16px); }
}
</style>
```

- [ ] **Step 2: TypeScript コンパイル確認**

```bash
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 3: `npm run dev` でブラウザ動作確認（後続 Task 6 の後）**

Task 6 完了後に手動確認する。

- [ ] **Step 4: コミット**

```bash
git add src/components/scanner/BarcodeScannerOverlay.vue
git commit -m "feat: add BarcodeScannerOverlay component (single/continuous modes)"
```

---

### Task 5: `BarcodeInputField.vue`

**Files:**
- Create: `src/components/scanner/BarcodeInputField.vue`

- [ ] **Step 1: コンポーネントファイルを作成**

`src/components/scanner/BarcodeInputField.vue`:
```vue
<template>
  <v-text-field
    :model-value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :hint="hint"
    :clearable="clearable"
    :disabled="disabled"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event as string)"
  >
    <template #append-inner>
      <v-btn
        icon
        size="x-small"
        variant="text"
        :disabled="disabled"
        tabindex="-1"
        @click.stop="scannerOpen = true"
      >
        <v-icon>mdi-barcode-scan</v-icon>
      </v-btn>
    </template>
  </v-text-field>

  <BarcodeScannerOverlay
    v-model="scannerOpen"
    mode="single"
    @scan="onScan"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BarcodeScannerOverlay from './BarcodeScannerOverlay.vue'
import type { ScanResult } from '@/types/scanner'

defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  hint?: string
  clearable?: boolean
  disabled?: boolean
}>(), {
  modelValue: '',
  clearable: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'scan': [result: ScanResult]
}>()

const scannerOpen = ref(false)

function onScan(result: ScanResult) {
  emit('update:modelValue', result.text)
  emit('scan', result)
}
</script>
```

- [ ] **Step 2: TypeScript コンパイル確認**

```bash
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/scanner/BarcodeInputField.vue
git commit -m "feat: add BarcodeInputField component (v-text-field + scan button)"
```

---

### Task 6: `ComponentSamplePage.vue` に動作確認セクションを追加

**Files:**
- Modify: `src/pages/ComponentSamplePage.vue`

- [ ] **Step 1: script に import とリアクティブ変数を追加**

`src/pages/ComponentSamplePage.vue` の `<script setup lang="ts">` 内 import 末尾に追加:
```ts
import BarcodeScannerOverlay from '@/components/scanner/BarcodeScannerOverlay.vue'
import BarcodeInputField from '@/components/scanner/BarcodeInputField.vue'
import type { ScanResult } from '@/types/scanner'
```

同じく `<script setup lang="ts">` 内の末尾（`confirmWheelRange` 関数の後）に追加:
```ts
// ⑩ バーコードスキャナー
const scannerOpen    = ref(false)
const scannedCode    = ref('')
const scanTableRows  = ref<ScanResult[]>([])
```

- [ ] **Step 2: template に ⑩ セクションを追加**

`src/pages/ComponentSamplePage.vue` の `</v-container>` 直前（最後の `<v-divider>` の後）に追加:

```html
      <v-divider class="mb-8" />

      <!-- ⑩ バーコードスキャナー -->
      <section class="mb-8">
        <p class="text-overline text-medium-emphasis mb-2">バーコード スキャナー</p>
        <p class="text-caption text-medium-emphasis mb-4">
          カメラを使ってバーコード・QRコードをリアルタイムで読み取ります。
          <code>npm run dev</code> のブラウザ環境でもWebカメラで動作確認できます。
        </p>

        <!-- BarcodeInputField（single モード） -->
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

        <!-- 連続スキャン → テーブル -->
        <v-card variant="outlined" class="pa-4">
          <p class="text-subtitle-2 font-weight-bold mb-1">連続スキャン → テーブル追加（BarcodeScannerOverlay）</p>
          <p class="text-caption text-medium-emphasis mb-3">
            「連続スキャン」ボタンで複数のコードを続けて読み取り、完了するとテーブルに一括追加します。
          </p>
          <div class="d-flex align-center gap-3 mb-3">
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-barcode-scan"
              @click="scannerOpen = true"
            >連続スキャン</v-btn>
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
            :headers="[
              { title: '読み取り値', key: 'text' },
              { title: 'フォーマット', key: 'format' },
              { title: '時刻', key: 'timestamp' },
            ]"
            :items="scanTableRows.map(r => ({
              text: r.text,
              format: r.format,
              timestamp: new Date(r.timestamp).toLocaleTimeString(),
            }))"
            density="compact"
            class="elevation-0"
          />
          <p v-else class="text-caption text-medium-emphasis">
            スキャン結果がここに表示されます。
          </p>
        </v-card>
      </section>

      <!-- ⑩ BarcodeScannerOverlay -->
      <BarcodeScannerOverlay
        v-model="scannerOpen"
        mode="continuous"
        @complete="scanTableRows.push(...$event)"
      />
```

- [ ] **Step 3: TypeScript コンパイル確認**

```bash
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/pages/ComponentSamplePage.vue
git commit -m "feat: add barcode scanner demo section to ComponentSamplePage"
```

---

### Task 7: ブラウザ動作確認

**Files:** なし（手動確認のみ）

- [ ] **Step 1: 開発サーバー起動**

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開き、「コンポーネントサンプル」ページに移動して一番下の「バーコード スキャナー」セクションを確認する。

- [ ] **Step 2: BarcodeInputField の動作確認**

1. バーコード入力欄右端のアイコン（`mdi-barcode-scan`）をクリック
2. フルスクリーンカメラが開くことを確認
3. PCのWebカメラにQRコードをかざして読み取りを確認
4. 読み取り後、入力欄に値が自動入力されることを確認
5. キャンセルボタンで何も入力されずに閉じることを確認

- [ ] **Step 3: BarcodeScannerOverlay（continuous）の動作確認**

1. 「連続スキャン」ボタンをクリックしてオーバーレイが開くことを確認
2. 複数のQR・バーコードを読み取り、履歴リストに追加されることを確認
3. 誤読みを「×」ボタンで削除できることを確認
4. 「完了」ボタンでオーバーレイが閉じ、テーブルに一括追加されることを確認
5. 「キャンセル」（← ボタン）で何もテーブルに追加されないことを確認

- [ ] **Step 4: エラーケース確認**

1. ブラウザでカメラ権限を「拒否」したときにエラーメッセージが表示されることを確認

- [ ] **Step 5: 最終コミット**

```bash
git add -A
git commit -m "feat: barcode/QR scanner — BarcodeInputField + BarcodeScannerOverlay complete"
```

---

## 既知の注意点

- **`format` 文字列:** `@zxing/browser` のバージョンによって `BarcodeFormat` の逆引き方法が異なる場合がある。もし `format` フィールドが数字文字列になる場合は Task 3 Note の代替コードに差し替える。
- **トーチ（懐中電灯）:** Android 実機では動作するが、PCブラウザ・エミュレータでは `torchAvailable` が `false` になりボタンが disabled になる（正常動作）。
- **`100dvh`:** Android のブラウザアドレスバーを考慮した `dvh` 単位を使用。古い WebView では `100vh` にフォールバックが必要な場合がある。
