# sample/scan 手入力フッターボタン常設実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to実行 this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手入力をフッターの常設ボタンにし、ダイアログの所有を ScanCameraView からページ側(logic)へ移す。

**Architecture:** `useScanScreen` が `manualOpen`/`openManual`/`handleManualSubmit` を持ち、submit は `format: 'MANUAL'` として既存 `handleScan` に流す(単発=結果画面へ、連続=リスト追加、分割=parser、MANUAL は OCR 確認に入らない)。`ScanCameraView` は内包ダイアログを捨てて `manual-request` イベント(error 自動検知+プレースホルダーボタン)を emit するだけにし、5スキャンページが `ScanManualInputDialog` とフッター「手入力」ボタンを持つ。

**Tech Stack:** Vue 3 / Vuetify 3 / vitest + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-07-30-manual-input-footer-design.md`

## Global Constraints

- 対象は `src/sample/scan/` のみ
- `ScanManualInputDialog` 本体は変更しない(追加で入力欄クリア+開いたまま、の既存挙動を流用)
- MANUAL は OCR 確認フロー(pendingOcrItem)に入らない。QR/バーコード/OCR/DEV 経路は無変更
- カメラ error 時の自動表示と×プレースホルダーの「手入力する」導線は従来どおり機能する(実装が emit 経由に変わるだけ)
- フッター構成: 単発 `[キャンセル][種別 ▴][手入力]`、連続 `[キャンセル][種別 ▴][手入力][読取完了]`。手入力ボタンの class は `.manual-input-btn`
- テストは `src/sample/scan/__tests__/`。実行: `npx vitest run <path>`、全体: `npm run test:run` + `npm run type-check`

---

### Task 1: useScanScreen に手入力状態と submit 処理を追加

**Files:**
- Modify: `src/sample/scan/logic/useScanScreen.ts`
- Test: `src/sample/scan/__tests__/screenLogic.test.ts`(追記)

**Interfaces:**
- Consumes: 既存 `handleScan` / `useScanSessionStore`
- Produces: `useScanScreen(config)` の戻り値に追加 — `manualOpen: Ref<boolean>`, `openManual()`, `handleManualSubmit(text: string)`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/screenLogic.test.ts` の `describe('useScanScreen', ...)` 内に追記:

```ts
  it('openManual で manualOpen が true になる', () => {
    const { manualOpen, openManual } = useScanScreen(getPattern('single-raw'))
    expect(manualOpen.value).toBe(false)
    openManual()
    expect(manualOpen.value).toBe(true)
  })

  it('handleManualSubmit: 単発は MANUAL として保存し結果画面へ遷移する', () => {
    const { handleManualSubmit } = useScanScreen(getPattern('single-raw'))
    handleManualSubmit('ABC-123')
    const store = useScanSessionStore()
    expect(store.single?.raw).toBe('ABC-123')
    expect(store.single?.format).toBe('MANUAL')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('handleManualSubmit: 連続は分割済みでリストに追加され OCR 確認には入らない', () => {
    const { handleManualSubmit, pendingOcrItem } = useScanScreen(getPattern('list-split'))
    handleManualSubmit('ITEM01,LOT-A,12')
    handleManualSubmit('ITEM02,LOT-B,5')
    const store = useScanSessionStore()
    expect(store.items).toHaveLength(2)
    expect(store.items[0].format).toBe('MANUAL')
    expect(store.items[0].fields).toEqual({ productCode: 'ITEM01', lot: 'LOT-A', qty: '12' })
    expect(pendingOcrItem.value).toBeNull()
  })
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: 既存14件 PASS、新規3件 FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/logic/useScanScreen.ts` の `discardOcr` 関数の後に追加:

```ts
  // フッター常設の手入力。submit は MANUAL として既存の読取経路に流す
  // (単発は結果画面へ遷移、連続は addItem。MANUAL は OCR 確認フローに入らない)
  const manualOpen = ref(false)
  function openManual() {
    manualOpen.value = true
  }
  function handleManualSubmit(text: string) {
    handleScan({ text, format: 'MANUAL', timestamp: Date.now() })
  }
```

return オブジェクトに `manualOpen, openManual, handleManualSubmit,` を追加(`pendingOcrItem, confirmOcr, discardOcr,` の行の直後)。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: PASS(17件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): useScanScreen に手入力の開閉状態と submit 処理を追加"
```

---

### Task 2: ScanCameraView の manual-request 化+5ページへのダイアログ/フッターボタン配線

**Files:**
- Modify: `src/sample/scan/components/ScanCameraView.vue`
- Modify: `src/sample/scan/pages/SingleRawScanPage.vue` / `SingleSplitScanPage.vue` / `SingleLookupScanPage.vue` / `ListRawScanPage.vue` / `ListSplitScanPage.vue`
- Test: `src/sample/scan/__tests__/ScanCameraView.test.ts`(改修)、`src/sample/scan/__tests__/scanPages.test.ts`(追記)

**Interfaces:**
- Consumes: Task 1 の `manualOpen`/`openManual`/`handleManualSubmit`、既存 `ScanManualInputDialog`(v-model + submit)
- Produces: `ScanCameraView` — props `{ scanType }`、emits `scan(ScanResult)` / `manual-request()`(ダイアログは持たない)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanCameraView.test.ts` を改修:
- import から `ScanManualInputDialog` を削除
- 以下の3テストを削除: 「error 発生で手入力ダイアログが自動表示される」「ダイアログの submit を format MANUAL の scan として emit する」「閉じた後も「手入力する」ボタンで再表示できる」
- 代わりに追加:

```ts
  it('error 発生で manual-request を emit する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    expect(w.emitted('manual-request')).toBeUndefined()
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    expect(w.emitted('manual-request')).toHaveLength(1)
  })

  it('プレースホルダーの手入力ボタンでも manual-request を emit する', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    mockError.value = 'カメラの起動に失敗しました。'
    await w.vm.$nextTick()
    await w.find('.manual-btn').trigger('click')
    // 自動検知の1回 + ボタンの1回
    expect(w.emitted('manual-request')).toHaveLength(2)
  })
```

`src/sample/scan/__tests__/scanPages.test.ts` に import を追加:

```ts
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
```

describe 群の末尾に追記:

```ts
describe('フッター手入力', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('手入力ボタンでダイアログが開く', async () => {
    const w = mount(SingleRawScanPage, mountOpts)
    expect(w.findComponent(ScanManualInputDialog).props('modelValue')).toBe(false)
    await w.find('.manual-input-btn').trigger('click')
    expect(w.findComponent(ScanManualInputDialog).props('modelValue')).toBe(true)
  })

  it('単発: ダイアログ submit で MANUAL として保存し結果画面へ遷移する', async () => {
    const w = mount(SingleRawScanPage, mountOpts)
    await w.find('.manual-input-btn').trigger('click')
    w.findComponent(ScanManualInputDialog).vm.$emit('submit', 'ABC-123')
    await w.vm.$nextTick()
    const store = useScanSessionStore()
    expect(store.single?.format).toBe('MANUAL')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('連続: ダイアログ submit で分割済みリストに追加されダイアログは開いたまま', async () => {
    const w = mount(ListSplitScanPage, mountOpts)
    await w.find('.manual-input-btn').trigger('click')
    const dialog = w.findComponent(ScanManualInputDialog)
    dialog.vm.$emit('submit', 'ITEM01,LOT-A,12')
    dialog.vm.$emit('submit', 'ITEM02,LOT-B,5')
    await w.vm.$nextTick()
    const store = useScanSessionStore()
    expect(store.count).toBe(2)
    expect(store.items[0].fields.productCode).toBe('ITEM01')
    expect(dialog.props('modelValue')).toBe(true)
  })

  it('カメラの manual-request でもダイアログが開く', async () => {
    const w = mount(SingleRawScanPage, mountOpts)
    w.findComponent(ScanCameraView).vm.$emit('manual-request')
    await w.vm.$nextTick()
    expect(w.findComponent(ScanManualInputDialog).props('modelValue')).toBe(true)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts src/sample/scan/__tests__/scanPages.test.ts`
Expected: ScanCameraView の新規2件 FAIL(manual-request 未実装)、scanPages の新規4件 FAIL(.manual-input-btn がない)。ScanCameraView の既存残テスト(マウント/scan emit/OCR シャッター/restart/プレースホルダー表示/dev-sim)は PASS のまま

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanCameraView.vue` の変更(3箇所):

1. template 26-28行付近のプレースホルダーボタンを:

```vue
      <v-btn class="manual-btn" color="primary" variant="tonal" @click="emit('manual-request')">
        手入力する
      </v-btn>
```

2. template 44行の `<ScanManualInputDialog v-model="manualOpen" @submit="onManualSubmit" />` を削除

3. script を変更:
- `import ScanManualInputDialog from './ScanManualInputDialog.vue'` を削除
- emits を `const emit = defineEmits<{ scan: [result: ScanResult]; 'manual-request': [] }>()` に変更
- `manualOpen`/`onManualSubmit` のブロック(74〜83行)を以下に置換:

```ts
// カメラ起動失敗時の手入力導線。失敗検知で親に手入力を要求し(=ページ側ダイアログの自動表示)、
// 閉じた後もプレースホルダーのボタンから再要求できる。ダイアログはページが所有する。
// エラーが再発するたび(タブ切替での再起動失敗を含む)自動で開き直すのは意図的
watch(error, (e) => {
  if (e) emit('manual-request')
})
```

5ページを以下に全置換。

`src/sample/scan/pages/SingleRawScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" @manual-request="openManual" />
    <p class="text-caption text-medium-emphasis pa-4">
      読み取ると結果画面へ遷移します
    </p>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title, manualOpen, openManual, handleManualSubmit } =
  useScanScreen(getPattern('single-raw'))
</script>
```

`src/sample/scan/pages/SingleSplitScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" @manual-request="openManual" />
    <p class="text-caption text-medium-emphasis pa-4">
      「商品コード,ロット,数量」形式のコードを読み取ると、分割して各項目に代入します
    </p>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title, manualOpen, openManual, handleManualSubmit } =
  useScanScreen(getPattern('single-split'))
</script>
```

`src/sample/scan/pages/SingleLookupScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" @manual-request="openManual" />
    <p class="text-caption text-medium-emphasis pa-4">
      商品コード(数値)を読み取ると、API で商品情報を照会して表示します
    </p>
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const { scanType, handleScan, cancel, title, manualOpen, openManual, handleManualSubmit } =
  useScanScreen(getPattern('single-lookup'))
</script>
```

`src/sample/scan/pages/ListRawScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" @manual-request="openManual" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <ScanOcrConfirmDialog
      :model-value="pendingOcrItem !== null"
      :item="pendingOcrItem"
      :field-defs="fields"
      :parser="parser"
      @confirm="confirmOcr"
      @discard="discardOcr"
    />
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const {
  scanType, count, latest, fields, parser,
  handleScan, finish, cancel, title,
  pendingOcrItem, confirmOcr, discardOcr,
  manualOpen, openManual, handleManualSubmit,
} = useScanScreen(getPattern('list-raw'))
</script>
```

`src/sample/scan/pages/ListSplitScanPage.vue`:

```vue
<template>
  <ScanFixedLayout :title="title">
    <ScanCameraView :scan-type="scanType" @scan="handleScan" @manual-request="openManual" />
    <ScanSummaryBar :count="count" :latest="latest" :fields="fields" />
    <ScanOcrConfirmDialog
      :model-value="pendingOcrItem !== null"
      :item="pendingOcrItem"
      :field-defs="fields"
      :parser="parser"
      @confirm="confirmOcr"
      @discard="discardOcr"
    />
    <ScanManualInputDialog v-model="manualOpen" @submit="handleManualSubmit" />
    <template #footer>
      <v-btn @click="cancel">キャンセル</v-btn>
      <ScanTypeMenuButton v-model="scanType" />
      <v-btn class="manual-input-btn" @click="openManual">手入力</v-btn>
      <v-btn color="primary" :disabled="!count" @click="finish">読取完了</v-btn>
    </template>
  </ScanFixedLayout>
</template>

<script setup lang="ts">
import ScanFixedLayout from '../components/ScanFixedLayout.vue'
import ScanTypeMenuButton from '../components/ScanTypeMenuButton.vue'
import ScanCameraView from '../components/ScanCameraView.vue'
import ScanSummaryBar from '../components/ScanSummaryBar.vue'
import ScanOcrConfirmDialog from '../components/ScanOcrConfirmDialog.vue'
import ScanManualInputDialog from '../components/ScanManualInputDialog.vue'
import { getPattern } from '../logic/patterns'
import { useScanScreen } from '../logic/useScanScreen'

const {
  scanType, count, latest, fields, parser,
  handleScan, finish, cancel, title,
  pendingOcrItem, confirmOcr, discardOcr,
  manualOpen, openManual, handleManualSubmit,
} = useScanScreen(getPattern('list-split'))
</script>
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts src/sample/scan/__tests__/scanPages.test.ts`
Expected: ScanCameraView 9件 PASS(旧3件削除+新2件)、scanPages 13件 PASS

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 手入力をフッター常設ボタン化しダイアログ所有をページ側へ移動"
```

---

### Task 3: 全体検証

- [ ] **Step 1: 全体検証**

```bash
npm run test:run
npm run type-check
```

Expected: 全テスト PASS、型エラーなし。失敗があれば修正。

- [ ] **Step 2: ブラウザ確認(コントローラー実施)**

1. カメラ正常時: フッター「手入力」→ダイアログ→値入力→単発は結果画面(形式 MANUAL)/連続は連続入力でリスト蓄積
2. 分割パターン: 手入力 'ITEM01,LOT-A,12' が分割されて格納される
3. カメラ失敗時: 従来どおり自動表示+×プレースホルダーの「手入力する」で再表示
4. フッター4ボタン(連続系)が 390px 幅で収まる。横スクロールなし
