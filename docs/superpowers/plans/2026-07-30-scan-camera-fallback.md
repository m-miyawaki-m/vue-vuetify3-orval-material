# sample/scan カメラ起動失敗フォールバック実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** カメラ起動失敗時に×プレースホルダー+手入力ダイアログを表示し、タブ伸長によるレイアウト崩れを修正する。

**Architecture:** 新規の純粋部品 `ScanManualInputDialog`(props/emits のみ)を `ScanCameraView` が抱え、error 検知で自動表示。手入力値は `format: 'MANUAL'` の `scan` イベントに変換して既存経路(parser/モード/resolver)へ流すため、パターン側は無変更。`v-tabs` のデフォルト `flex: 1 1 auto` を `flex: none` に固定して空白バグを解消。

**Tech Stack:** Vue 3 (`<script setup>` + TS) / Vuetify 3 / vitest + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-07-30-scan-camera-fallback-design.md`

## Global Constraints

- 対象は `src/sample/scan/` のみ。既存 `ScannerPage`/`ScanModePage`/`BarcodeInputField`/`useBarcodeScanner` は変更しない
- 部品(components/)は props/emits のみで通信。store・router を import しない
- 手入力値は `{ text, format: 'MANUAL', timestamp: Date.now() }` の `scan` イベントとして emit(パターン側は無変更)
- エラー文言は既存 `useBarcodeScanner` の error(権限拒否/カメラなし/起動失敗)をそのまま表示
- DEV 用疑似スキャン入力は error 時も従来どおり上部に残す
- プレビュー領域は error 時も 40vh のまま
- テストは `src/sample/scan/__tests__/` に配置。実行: `npx vitest run <path>`、全体検証: `npm run test:run` と `npm run type-check`
- vitest のグローバル setup(`src/test/setup.ts`)が Vuetify/Pinia を毎テスト初期化済み。ページ/部品テストは `global: { stubs: { teleport: true } }` で mount する既存流儀に合わせる

---

### Task 1: ScanManualInputDialog(手入力ダイアログ部品)

**Files:**
- Create: `src/sample/scan/components/ScanManualInputDialog.vue`
- Test: `src/sample/scan/__tests__/ScanManualInputDialog.test.ts`

**Interfaces:**
- Consumes: なし(純粋部品)
- Produces: `ScanManualInputDialog` — props `{ modelValue: boolean }`、emits `update:modelValue(boolean)` / `submit(text: string)`。「追加」は trim 後の非空文字のみ emit し**入力欄をクリアして開いたまま**(連続入力対応)。「閉じる」は `update:modelValue(false)` のみ

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanManualInputDialog.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'

const mountDialog = () =>
  mount(ScanManualInputDialog, {
    props: { modelValue: true },
    global: { stubs: { teleport: true } },
  })

describe('ScanManualInputDialog', () => {
  it('入力して追加すると submit を emit し入力欄がクリアされる', async () => {
    const w = mountDialog()
    const input = w.find('input')
    await input.setValue('ITEM01,LOT-A,12')
    await w.find('.submit-btn').trigger('click')
    expect(w.emitted('submit')?.[0]).toEqual(['ITEM01,LOT-A,12'])
    expect((input.element as HTMLInputElement).value).toBe('')
    // 開いたまま(連続入力対応): 閉じる指示は出ていない
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('前後空白は trim して emit する', async () => {
    const w = mountDialog()
    await w.find('input').setValue('  ABC  ')
    await w.find('.submit-btn').trigger('click')
    expect(w.emitted('submit')?.[0]).toEqual(['ABC'])
  })

  it('空文字では submit を emit しない', async () => {
    const w = mountDialog()
    await w.find('input').setValue('   ')
    await w.find('.submit-btn').trigger('click')
    expect(w.emitted('submit')).toBeUndefined()
  })

  it('Enter キーでも追加できる', async () => {
    const w = mountDialog()
    const input = w.find('input')
    await input.setValue('XYZ')
    await input.trigger('keydown.enter')
    expect(w.emitted('submit')?.[0]).toEqual(['XYZ'])
  })

  it('閉じるで update:modelValue(false) を emit する', async () => {
    const w = mountDialog()
    await w.find('.close-btn').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanManualInputDialog.test.ts`
Expected: FAIL(コンポーネントが存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanManualInputDialog.vue`:

```vue
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="360"
    eager
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-subtitle-1">手入力</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="text"
          label="読取値"
          variant="outlined"
          density="compact"
          hide-details
          autofocus
          @keydown.enter="submit"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn class="close-btn" variant="text" @click="emit('update:modelValue', false)">
          閉じる
        </v-btn>
        <v-btn class="submit-btn" color="primary" variant="tonal" @click="submit">
          追加
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [text: string]
}>()

const text = ref('')

// 追加後も開いたまま入力欄だけクリアする(連続モードでの連続入力対応)。
// 単発モードは親ページが結果画面へ遷移しアンマウントされるため自然に閉じる
function submit() {
  const v = text.value.trim()
  if (!v) return
  emit('submit', v)
  text.value = ''
}
</script>
```

※ `eager` は閉状態でも中身を DOM に生成する Vuetify の指定。テスト安定化と autofocus のため付与。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanManualInputDialog.test.ts`
Expected: PASS(5件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 手入力ダイアログ部品 ScanManualInputDialog を追加"
```

---

### Task 2: ScanCameraView の×プレースホルダー+ダイアログ統合

**Files:**
- Modify: `src/sample/scan/components/ScanCameraView.vue`
- Test: `src/sample/scan/__tests__/ScanCameraView.test.ts`(既存を拡張)

**Interfaces:**
- Consumes: Task 1 の `ScanManualInputDialog`(props `modelValue`、emits `update:modelValue`/`submit`)、既存 `useScanEngine` の `error: Ref<string | null>`
- Produces: `ScanCameraView` の外部インターフェースは不変(props `scanType`、emit `scan`)。error 時に `.camera-fallback` プレースホルダー(camera-off アイコン+文言+`.manual-btn`)を表示し、手入力 submit を `format: 'MANUAL'` の `scan` として emit

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanCameraView.test.ts` を拡張する。まず既存モックの `error: ref(null)` を**外部から変更可能な共有 ref** に変える(既存テストは error=null のままなので影響しない):

モック部分を以下に差し替え:

```ts
const mockStart = vi.fn()
const mockStop = vi.fn()
let capturedOnScan: ((r: ScanResult) => void) | null = null
const mockError = ref<string | null>(null)

vi.mock('@/composables/useBarcodeScanner', () => ({
  useBarcodeScanner: vi.fn((_videoRef, options) => {
    capturedOnScan = options.onScan
    return {
      start: mockStart,
      stop: mockStop,
      isScanning: ref(false),
      error: mockError,
      torchAvailable: ref(false),
      switchTorch: vi.fn(),
    }
  }),
}))
```

`beforeEach` に `mockError.value = null` を追加し、import に `ScanManualInputDialog` を加える:

```ts
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
```

describe 末尾に新規テストを追加:

```ts
  it('error 発生時は×プレースホルダーを表示し video を隠す', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(w.find('.camera-fallback').exists()).toBe(false)
    mockError.value = 'カメラへのアクセスが拒否されました。設定から許可してください。'
    await w.vm.$nextTick()
    expect(w.find('.camera-fallback').exists()).toBe(true)
    expect(w.text()).toContain('カメラへのアクセスが拒否されました')
    expect(w.find('video').isVisible()).toBe(false)
    expect(w.find('.camera-frame').exists()).toBe(false)
  })

  it('error 発生で手入力ダイアログが自動表示される', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(w.findComponent(ScanManualInputDialog).props('modelValue')).toBe(false)
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    expect(w.findComponent(ScanManualInputDialog).props('modelValue')).toBe(true)
  })

  it('ダイアログの submit を format MANUAL の scan として emit する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    w.findComponent(ScanManualInputDialog).vm.$emit('submit', 'ITEM01,LOT-A,12')
    const emitted = w.emitted('scan')?.at(-1)?.[0] as ScanResult
    expect(emitted.text).toBe('ITEM01,LOT-A,12')
    expect(emitted.format).toBe('MANUAL')
  })

  it('閉じた後も「手入力する」ボタンで再表示できる', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    const dialog = w.findComponent(ScanManualInputDialog)
    dialog.vm.$emit('update:modelValue', false)
    await w.vm.$nextTick()
    expect(dialog.props('modelValue')).toBe(false)
    await w.find('.manual-btn').trigger('click')
    expect(dialog.props('modelValue')).toBe(true)
  })

  it('error 時は疑似スキャン入力(DEV)は残る', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    expect(w.find('.dev-sim').exists()).toBe(true)
  })
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts`
Expected: 既存5件 PASS、新規5件 FAIL(`.camera-fallback` 等が存在しない)

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanCameraView.vue` を以下に全置換:

```vue
<template>
  <div class="camera-wrap">
    <video v-show="!error" ref="videoRef" class="camera-video" autoplay muted playsinline />
    <div v-if="!error" class="camera-frame" />

    <v-btn
      v-if="torchAvailable && !isOcr && !error"
      class="torch-btn"
      :icon="torchOn ? 'mdi-flashlight-off' : 'mdi-flashlight'"
      size="small"
      @click="toggleTorch"
    />
    <v-btn
      v-if="isOcr && !error"
      class="shutter-btn"
      icon="mdi-camera"
      size="large"
      color="primary"
      @click="captureOcr"
    />

    <!-- カメラ起動失敗時: ×プレースホルダー + 手入力導線 -->
    <div v-if="error" class="camera-fallback">
      <v-icon icon="mdi-camera-off" size="64" class="text-medium-emphasis" />
      <p class="text-body-2 text-medium-emphasis px-4 text-center">{{ error }}</p>
      <v-btn class="manual-btn" color="primary" variant="tonal" @click="manualOpen = true">
        手入力する
      </v-btn>
    </div>

    <div v-if="isDev" class="dev-sim">
      <v-text-field
        v-model="simText"
        label="開発用: 疑似スキャン"
        density="compact"
        hide-details
        bg-color="surface"
        append-inner-icon="mdi-send"
        @click:append-inner="simulate"
        @keydown.enter="simulate"
      />
    </div>

    <ScanManualInputDialog v-model="manualOpen" @submit="onManualSubmit" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toRef, watch } from 'vue'
import type { ScanResult } from '@/types/scanner'
import type { ScanType } from '../types'
import { useScanEngine } from '../logic/useScanEngine'
import ScanManualInputDialog from './ScanManualInputDialog.vue'

const props = defineProps<{ scanType: ScanType }>()
const emit = defineEmits<{ scan: [result: ScanResult] }>()

const videoRef = ref<HTMLVideoElement | null>(null)
const engine = useScanEngine(videoRef, toRef(props, 'scanType'), (r) => emit('scan', r))
const { error, torchAvailable, isOcr, captureOcr } = engine

onMounted(engine.start)
const torchOn = ref(false)
watch(() => props.scanType, () => {
  // 新しいストリームはトーチ OFF で始まるため、表示状態を実態に合わせてリセットする
  torchOn.value = false
  engine.restart()
})
async function toggleTorch() {
  torchOn.value = !torchOn.value
  await engine.switchTorch(torchOn.value)
}

// カメラ起動失敗時の手入力フォールバック。失敗検知で自動表示し、
// 閉じた後もプレースホルダーのボタンから再表示できる
const manualOpen = ref(false)
watch(error, (e) => {
  if (e) manualOpen.value = true
})
function onManualSubmit(text: string) {
  emit('scan', { text, format: 'MANUAL', timestamp: Date.now() })
}

// ブラウザ開発時にカメラなしで動作確認するための疑似入力
const isDev = import.meta.env.DEV
const simText = ref('')
function simulate() {
  if (!simText.value) return
  emit('scan', { text: simText.value, format: 'DEV', timestamp: Date.now() })
  simText.value = ''
}
</script>

<style scoped>
.camera-wrap {
  position: relative;
  height: 40vh;
  flex: none;
  background: #000;
}
.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.camera-frame {
  position: absolute;
  inset: 15% 10%;
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  pointer-events: none;
}
.torch-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}
.shutter-btn {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
}
.camera-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.dev-sim {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 8px;
}
</style>
```

変更点: `v-alert.camera-error` を廃止し `.camera-fallback` に置換 / video は `v-show`(ref 維持のため)/ 枠・トーチ・シャッターに `!error` 条件 / `ScanManualInputDialog` 統合 / `watch(error)` で自動表示。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts`
Expected: PASS(10件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): カメラ起動失敗時に×プレースホルダーと手入力ダイアログを表示"
```

---

### Task 3: タブ伸長修正 + 全体検証

**Files:**
- Modify: `src/sample/scan/components/ScanTypeTabs.vue`(scoped style 追加)

**Interfaces:**
- Consumes: なし
- Produces: レイアウト修正のみ(外部インターフェース不変)

- [ ] **Step 1: flex 修正**

`src/sample/scan/components/ScanTypeTabs.vue` の末尾(`</script>` の後)に追加:

```vue
<style scoped>
/* v-tabs のデフォルト flex: 1 1 auto は縦 flex(.scan-fixed)内で
   余白いっぱいに伸びてタブ下に黒い空白を作るため固定する */
.v-tabs {
  flex: none;
}
</style>
```

- [ ] **Step 2: 全体検証**

```bash
npm run test:run
npm run type-check
```

Expected: 既存含め全テスト PASS(Task 1-2 の追加分含む)、型エラーなし。

- [ ] **Step 3: ブラウザ確認(手動)**

`npm run dev` を起動し確認:

1. カメラ正常時(または疑似スキャン利用): `/#/sample/scan/single-raw` でタブ直下にカメラが来ておりタブ下の黒い空白が消えている
2. カメラ失敗時(ブラウザでカメラ権限をブロック、またはヘッドレスで権限なし起動):
   - プレビュー領域(40vh)中央に camera-off アイコン+エラー文言+「手入力する」ボタン
   - 手入力ダイアログが自動で開く
   - ダイアログに `ITEM01,LOT-A,12` を入力して追加 → single-split なら分割フォームへ、list-split なら「追加」を繰り返してリストに蓄積される
   - ダイアログを閉じて「手入力する」で再表示できる
   - 横スクロールが出ない

- [ ] **Step 4: コミット**

```bash
git add src/sample/scan
git commit -m "fix(sample-scan): v-tabs の flex 伸長によるタブ下の空白を解消"
```
