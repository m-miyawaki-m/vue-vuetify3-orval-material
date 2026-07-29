# OCR シャッターのフッター移動+一覧→明細遷移 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** OCR シャッターをプレビュー上のオーバーレイからフッターへ移し、連続系の結果一覧カードから明細画面へ遷移できるようにする。

**Architecture:** ①`ScanCameraView` は `.shutter-btn` オーバーレイを廃止して `defineExpose({ captureOcr })`、ページがテンプレート ref 経由でフッターの📷ボタン(OCR 時のみ表示)から呼ぶ。②`ScanItemList` はカード全体クリックで `select(index)` を emit(chevron アイコンで明示、削除は `@click.stop`)。`useResultScreen.openDetail` が `resultPath/:index` へ push し、新 logic `useItemDetailScreen` が route param から item を引いて明細ページ(読み取り専用・薄い側)2枚に供給する。

**Tech Stack:** Vue 3 / Vuetify 3 / vue-router / vitest + @vue/test-utils

**Spec:** `docs/superpowers/specs/2026-07-30-ocr-shutter-footer-item-detail-design.md`

## Global Constraints

- 対象は `src/sample/scan/`+`src/router/index.ts`(明細ルート2本の追加のみ)
- 撮影後のフロー(連続=確認ダイアログ、単発=結果画面)・トーチ(プレビュー上)・カメラ失敗×プレースホルダー・手入力は変更しない
- 明細画面は読み取り専用(編集・削除なし)。単発系に明細は作らない
- フッター📷は `scanType === 'ocr'` のときのみ表示、class `.shutter-btn`、icon `mdi-camera`、color primary
- 明細ルートは `/sample/scan/list-raw/result/:index` と `/sample/scan/list-split/result/:index`(catch-all より前に挿入)
- テストは `src/sample/scan/__tests__/`。実行: `npx vitest run <path>`、全体: `npm run test:run` + `npm run type-check`

---

### Task 1: ScanItemList のカード選択(select emit + chevron)

**Files:**
- Modify: `src/sample/scan/components/ScanItemList.vue`
- Test: `src/sample/scan/__tests__/ScanItemList.test.ts`(追記)

**Interfaces:**
- Consumes: 既存 props `{ items, fields }`
- Produces: emits に `select(index: number)` を追加。カード全体クリックで emit、`.remove-btn` は `@click.stop`(select を出さない)、各カード右端に `.detail-icon`(mdi-chevron-right)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanItemList.test.ts` の describe 内に追記:

```ts
  it('カードクリックで select(index) を emit する', async () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    await w.findAll('.scan-item-card')[1].trigger('click')
    expect(w.emitted('select')?.[0]).toEqual([1])
  })

  it('削除ボタンクリックでは select は emit されない', async () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    await w.findAll('.remove-btn')[0].trigger('click')
    expect(w.emitted('remove')?.[0]).toEqual([0])
    expect(w.emitted('select')).toBeUndefined()
  })

  it('遷移可能を示す chevron アイコンが各カードに表示される', () => {
    const w = mount(ScanItemList, { props: { items, fields } })
    expect(w.findAll('.detail-icon')).toHaveLength(2)
  })
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanItemList.test.ts`
Expected: 既存6件 PASS、新規3件 FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanItemList.vue` のカード部分(v-card 〜 /v-card)を以下に置換し、emits を拡張:

```vue
      <v-card
        v-for="(item, i) in items"
        :key="`${item.timestamp}-${i}`"
        class="scan-item-card mb-2"
        variant="outlined"
        link
        @click="emit('select', i)"
      >
        <v-card-text class="py-2 d-flex justify-space-between align-start">
          <div class="min-width-0">
            <template v-if="fields.length">
              <p v-for="f in fields" :key="f.key" class="text-body-2">
                <span class="text-medium-emphasis">{{ f.label }}: </span>{{ item.fields[f.key] ?? '' }}
              </p>
            </template>
            <template v-else>
              <p class="text-body-2" style="word-break: break-all">読取値: {{ item.raw }}</p>
              <p class="text-caption text-medium-emphasis">
                形式: {{ item.format }} / {{ formatTime(item.timestamp) }}
              </p>
            </template>
          </div>
          <div class="d-flex flex-column align-center">
            <v-btn
              class="remove-btn"
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              @click.stop="emit('remove', i)"
            />
            <!-- カードタップで明細へ遷移できることを示す -->
            <v-icon class="detail-icon text-medium-emphasis" icon="mdi-chevron-right" />
          </div>
        </v-card-text>
      </v-card>
```

script の emits を:

```ts
const emit = defineEmits<{ remove: [index: number]; clear: []; select: [index: number] }>()
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanItemList.test.ts`
Expected: PASS(9件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 一覧カードをタップ可能にし select emit と chevron を追加"
```

---

### Task 2: openDetail + useItemDetailScreen(logic)

**Files:**
- Modify: `src/sample/scan/logic/useResultScreen.ts`
- Create: `src/sample/scan/logic/useItemDetailScreen.ts`
- Test: `src/sample/scan/__tests__/screenLogic.test.ts`(mock 拡張+追記)

**Interfaces:**
- Consumes: 既存 store / `ScanPatternConfig`
- Produces:
  - `useResultScreen` 戻り値に `openDetail(index: number)` 追加(`router.push(`${config.resultPath}/${index}`)`)
  - `useItemDetailScreen(config)` → `{ item: ComputedRef<ScanItem | null>, index: number, title: string, fields: ScanFieldDef[] }`。route param `index` を数値化し、別パターン/範囲外は `router.replace(config.resultPath)`

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/screenLogic.test.ts` の vue-router モックを以下に差し替え(useRoute 追加。既存テストへの影響なし):

```ts
const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
const mockRouteParams: Record<string, string> = {}
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
  useRoute: () => ({ params: mockRouteParams }),
}))
```

import に `useItemDetailScreen` を追加:

```ts
import { useItemDetailScreen } from '../logic/useItemDetailScreen'
```

ファイル末尾に追記:

```ts
describe('openDetail / useItemDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete mockRouteParams.index
  })

  it('openDetail で明細ルートへ遷移する', () => {
    const store = useScanSessionStore()
    store.startSession('list-split', 'continuous')
    store.addItem({ raw: 'A,B,1', format: 'QR_CODE', timestamp: 1, fields: {} })
    const { openDetail } = useResultScreen(getPattern('list-split'))
    openDetail(0)
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/list-split/result/0')
  })

  it('useItemDetailScreen: 正常 index で item を返す', () => {
    const store = useScanSessionStore()
    store.startSession('list-split', 'continuous')
    store.addItem({
      raw: 'ITEM01,LOT-A,12',
      format: 'QR_CODE',
      timestamp: 1,
      fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
    })
    mockRouteParams.index = '0'
    const { item, index } = useItemDetailScreen(getPattern('list-split'))
    expect(index).toBe(0)
    expect(item.value?.raw).toBe('ITEM01,LOT-A,12')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('useItemDetailScreen: 範囲外 index は一覧へ replace する', () => {
    const store = useScanSessionStore()
    store.startSession('list-split', 'continuous')
    mockRouteParams.index = '5'
    useItemDetailScreen(getPattern('list-split'))
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/list-split/result')
  })

  it('useItemDetailScreen: 別パターンのセッションは一覧へ replace する', () => {
    const store = useScanSessionStore()
    store.startSession('list-raw', 'continuous')
    store.addItem({ raw: 'A', format: 'X', timestamp: 1, fields: {} })
    mockRouteParams.index = '0'
    useItemDetailScreen(getPattern('list-split'))
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/list-split/result')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: 既存17件 PASS、新規4件 FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/logic/useResultScreen.ts` — `clearItems` 関数の後に追加し、return に `openDetail,` を追加:

```ts
  function openDetail(index: number) {
    router.push(`${config.resultPath}/${index}`)
  }
```

`src/sample/scan/logic/useItemDetailScreen.ts` を新規作成:

```ts
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScanSessionStore } from '../stores/scanSessionStore'
import type { ScanPatternConfig } from './patterns'

/** 一覧カードから遷移する明細画面の結線ロジック(読み取り専用) */
export function useItemDetailScreen(config: ScanPatternConfig) {
  const route = useRoute()
  const router = useRouter()
  const store = useScanSessionStore()

  const index = Number.parseInt(String(route.params.index), 10)
  const item = computed(() => store.items[index] ?? null)

  // 別パターンのセッション・範囲外 index は一覧へ戻す
  // (セッション自体がない場合は一覧側のガードがさらにスキャン画面へ送る)
  if (store.patternId !== config.id || !Number.isInteger(index) || !store.items[index]) {
    router.replace(config.resultPath)
  }

  return {
    item,
    index,
    title: config.title,
    fields: config.fields,
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/screenLogic.test.ts`
Expected: PASS(21件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): 明細遷移ロジック openDetail と useItemDetailScreen を追加"
```

---

### Task 3: 明細ページ2枚+結果ページ配線+ルート追加

**Files:**
- Create: `src/sample/scan/pages/ListRawItemDetailPage.vue` / `ListSplitItemDetailPage.vue`
- Modify: `src/sample/scan/pages/ListRawResultPage.vue` / `ListSplitResultPage.vue`(select 配線)
- Modify: `src/router/index.ts`(明細ルート2本)
- Test: `src/sample/scan/__tests__/resultPages.test.ts`(mock 拡張+追記)

**Interfaces:**
- Consumes: Task 1 の `select` emit、Task 2 の `openDetail` / `useItemDetailScreen`
- Produces: 明細ページ2枚(読み取り専用)、結果一覧からの遷移経路

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/resultPages.test.ts` の vue-router モックを以下に差し替え(useRoute 追加):

```ts
const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()
const mockRouteParams: Record<string, string> = {}
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
  useRoute: () => ({ params: mockRouteParams }),
}))
```

import を追加:

```ts
import ListSplitItemDetailPage from '../pages/ListSplitItemDetailPage.vue'
import ScanItemList from '../components/ScanItemList.vue'
```

ファイル末尾に追記:

```ts
describe('明細画面', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete mockRouteParams.index
  })

  function seedListSplit() {
    const store = useScanSessionStore()
    store.startSession('list-split', 'continuous')
    store.addItem({
      raw: 'ITEM01,LOT-A,12',
      format: 'QR_CODE',
      timestamp: 1000,
      fields: { productCode: 'ITEM01', lot: 'LOT-A', qty: '12' },
    })
    return store
  }

  it('一覧カードの select で明細ルートへ push される', async () => {
    seedListSplit()
    const w = mount(ListSplitResultPage, mountOpts)
    w.findComponent(ScanItemList).vm.$emit('select', 0)
    await w.vm.$nextTick()
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/list-split/result/0')
  })

  it('明細ページが読取値・形式・分割項目を表示する', () => {
    seedListSplit()
    mockRouteParams.index = '0'
    const w = mount(ListSplitItemDetailPage, mountOpts)
    expect(w.text()).toContain('ITEM01,LOT-A,12')
    expect(w.text()).toContain('QR_CODE')
    expect(w.text()).toContain('商品コード: ITEM01')
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('範囲外 index の明細ページは一覧へ replace する', () => {
    seedListSplit()
    mockRouteParams.index = '9'
    mount(ListSplitItemDetailPage, mountOpts)
    expect(mockReplace).toHaveBeenCalledWith('/sample/scan/list-split/result')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/resultPages.test.ts`
Expected: 既存 PASS のまま、新規3件 FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/pages/ListSplitItemDetailPage.vue` を新規作成:

```vue
<template>
  <SubLayout :title="`${title} - 明細 (${index + 1}件目)`">
    <v-container v-if="item">
      <v-card variant="outlined">
        <v-card-text>
          <p class="text-overline text-medium-emphasis mb-1">読取情報</p>
          <p class="text-body-2" style="word-break: break-all">読取値: {{ item.raw }}</p>
          <p class="text-caption text-medium-emphasis">形式: {{ item.format }}</p>
          <p class="text-caption text-medium-emphasis">時刻: {{ time }}</p>
          <template v-if="fields.length">
            <v-divider class="my-3" />
            <p v-for="f in fields" :key="f.key" class="text-body-2">
              <span class="text-medium-emphasis">{{ f.label }}: </span>{{ item.fields[f.key] ?? '' }}
            </p>
          </template>
        </v-card-text>
      </v-card>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import { getPattern } from '../logic/patterns'
import { useItemDetailScreen } from '../logic/useItemDetailScreen'

const { item, index, title, fields } = useItemDetailScreen(getPattern('list-split'))
const time = computed(() =>
  item.value ? new Date(item.value.timestamp).toLocaleTimeString() : '',
)
</script>
```

`src/sample/scan/pages/ListRawItemDetailPage.vue` を新規作成(getPattern が 'list-raw' な点のみ違う):

```vue
<template>
  <SubLayout :title="`${title} - 明細 (${index + 1}件目)`">
    <v-container v-if="item">
      <v-card variant="outlined">
        <v-card-text>
          <p class="text-overline text-medium-emphasis mb-1">読取情報</p>
          <p class="text-body-2" style="word-break: break-all">読取値: {{ item.raw }}</p>
          <p class="text-caption text-medium-emphasis">形式: {{ item.format }}</p>
          <p class="text-caption text-medium-emphasis">時刻: {{ time }}</p>
          <template v-if="fields.length">
            <v-divider class="my-3" />
            <p v-for="f in fields" :key="f.key" class="text-body-2">
              <span class="text-medium-emphasis">{{ f.label }}: </span>{{ item.fields[f.key] ?? '' }}
            </p>
          </template>
        </v-card-text>
      </v-card>
    </v-container>
  </SubLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SubLayout from '@/components/layout/SubLayout.vue'
import { getPattern } from '../logic/patterns'
import { useItemDetailScreen } from '../logic/useItemDetailScreen'

const { item, index, title, fields } = useItemDetailScreen(getPattern('list-raw'))
const time = computed(() =>
  item.value ? new Date(item.value.timestamp).toLocaleTimeString() : '',
)
</script>
```

`src/sample/scan/pages/ListRawResultPage.vue` と `ListSplitResultPage.vue`: destructure に `openDetail` を追加し、`ScanItemList` に `@select="openDetail"` を追加(それぞれ既存の `@remove`/`@clear` と並べる)。例(ListSplitResultPage):

```vue
    <ScanItemList
      :items="items"
      :fields="fields"
      @remove="removeItem"
      @clear="clearItems"
      @select="openDetail"
    />
```

```ts
const { items, fields, rescan, confirm, removeItem, clearItems, openDetail, title } =
  useResultScreen(getPattern('list-split'))
```

`src/router/index.ts`: `/sample/scan/list-raw/result` の行の直後に:

```ts
    { path: '/sample/scan/list-raw/result/:index', component: () => import('@/sample/scan/pages/ListRawItemDetailPage.vue') },
```

`/sample/scan/list-split/result` の行の直後に:

```ts
    { path: '/sample/scan/list-split/result/:index', component: () => import('@/sample/scan/pages/ListSplitItemDetailPage.vue') },
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/resultPages.test.ts`
Expected: PASS(既存+3件)

- [ ] **Step 5: コミット**

```bash
git add src/sample/scan src/router
git commit -m "feat(sample-scan): 連続系の一覧カードから明細画面へ遷移できるようにルートとページを追加"
```

---

### Task 4: OCR シャッターのフッター移動 + 全体検証

**Files:**
- Modify: `src/sample/scan/components/ScanCameraView.vue`
- Modify: スキャンページ5枚(`SingleRawScanPage.vue` / `SingleSplitScanPage.vue` / `SingleLookupScanPage.vue` / `ListRawScanPage.vue` / `ListSplitScanPage.vue`)
- Test: `src/sample/scan/__tests__/ScanCameraView.test.ts`(改修)、`src/sample/scan/__tests__/scanPages.test.ts`(追記)

**Interfaces:**
- Consumes: 既存 `useScanEngine` の `captureOcr`
- Produces: `ScanCameraView` は `defineExpose({ captureOcr })`(オーバーレイ `.shutter-btn` 廃止)。各ページはテンプレート ref `cameraRef` + フッターに `v-if="scanType === 'ocr'"` の `.shutter-btn`(icon mdi-camera / color primary)

- [ ] **Step 1: 失敗するテストを書く**

`src/sample/scan/__tests__/ScanCameraView.test.ts`: 「ocr のときシャッターボタンが表示され、押すとダミー文字列を emit する」と「barcode のときシャッターボタンは表示されない」の2テストを削除し、以下に置換:

```ts
  it('オーバーレイのシャッターは廃止され captureOcr が expose される', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'ocr' as const } })
    expect(w.find('.shutter-btn').exists()).toBe(false)
    ;(w.vm as unknown as { captureOcr: () => void }).captureOcr()
    await w.vm.$nextTick()
    const emitted = w.emitted('scan')?.[0]?.[0] as ScanResult
    expect(emitted.text).toBe(OCR_DUMMY_TEXT)
    expect(emitted.format).toBe('OCR')
  })

  it('captureOcr は ocr 以外では何も emit しない(expose 経由)', async () => {
    const w = mount(ScanCameraView, { props: { scanType: 'barcode' as const } })
    ;(w.vm as unknown as { captureOcr: () => void }).captureOcr()
    await w.vm.$nextTick()
    expect(w.emitted('scan')).toBeUndefined()
  })
```

`src/sample/scan/__tests__/scanPages.test.ts` の describe 群の末尾に追記:

```ts
describe('フッター OCR シャッター', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnScan = null
  })

  it('barcode のときフッターにシャッターは表示されない', () => {
    const w = mount(SingleRawScanPage, mountOpts)
    expect(w.find('.shutter-btn').exists()).toBe(false)
  })

  it('ocr のとき単発ページのシャッター押下で読取が発生し結果画面へ遷移する', async () => {
    useScanSessionStore().setScanType('ocr')
    const w = mount(SingleRawScanPage, mountOpts)
    await w.find('.shutter-btn').trigger('click')
    const store = useScanSessionStore()
    expect(store.single?.format).toBe('OCR')
    expect(mockPush).toHaveBeenCalledWith('/sample/scan/single-raw/result')
  })

  it('ocr のとき連続ページのシャッター押下で確認ダイアログに入る', async () => {
    useScanSessionStore().setScanType('ocr')
    const w = mount(ListSplitScanPage, mountOpts)
    await w.find('.shutter-btn').trigger('click')
    await w.vm.$nextTick()
    expect(useScanSessionStore().count).toBe(0)
    expect(w.findComponent(ScanOcrConfirmDialog).props('modelValue')).toBe(true)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts src/sample/scan/__tests__/scanPages.test.ts`
Expected: ScanCameraView の置換2件 FAIL(オーバーレイがまだ存在)、scanPages の新規3件 FAIL

- [ ] **Step 3: 実装**

`src/sample/scan/components/ScanCameraView.vue`:

1. template のシャッターブロックを削除:

```vue
    <v-btn
      v-if="isOcr && !error"
      class="shutter-btn"
      icon="mdi-camera"
      size="large"
      color="primary"
      @click="captureOcr"
    />
```

2. scoped style の `.shutter-btn { ... }` ルールを削除

3. script の `const { error, torchAvailable, isOcr, captureOcr } = engine` の後に追加:

```ts
// フッター側のシャッターボタン(ページ所有)から撮影を起動できるように公開する
defineExpose({ captureOcr })
```

スキャンページ5枚: `ScanCameraView` に `ref="cameraRef"` を追加し、script に ref 定義、フッターの「手入力」の直後(連続系は読取完了の前)に📷ボタンを追加。単発3枚は以下の形(パターン id と案内文はそれぞれ既存のまま):

```vue
    <ScanCameraView
      ref="cameraRef"
      :scan-type="scanType"
      @scan="handleScan"
      @manual-request="openManual"
    />
```

```vue
      <v-btn
        v-if="scanType === 'ocr'"
        class="shutter-btn"
        icon="mdi-camera"
        color="primary"
        @click="cameraRef?.captureOcr()"
      />
```

script に追加(全5ページ共通):

```ts
import { ref } from 'vue'
```

```ts
const cameraRef = ref<InstanceType<typeof ScanCameraView> | null>(null)
```

フッター構成: 単発 `[キャンセル][種別][手入力][📷(ocr時)]`、連続 `[キャンセル][種別][手入力][📷(ocr時)][読取完了]`。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run src/sample/scan/__tests__/ScanCameraView.test.ts src/sample/scan/__tests__/scanPages.test.ts`
Expected: 両ファイル PASS

- [ ] **Step 5: 全体検証**

```bash
npm run test:run
npm run type-check
```

Expected: 全テスト PASS、型エラーなし。失敗があれば修正。

- [ ] **Step 6: コミット**

```bash
git add src/sample/scan
git commit -m "feat(sample-scan): OCR シャッターをフッターへ移動(ScanCameraView は captureOcr を expose)"
```

- [ ] **Step 7: ブラウザ確認(コントローラー実施)**

1. OCR 選択時のみフッターに📷が出る(単発4要素・連続5要素が 390px で収まる)
2. 📷押下 → 連続は確認ダイアログ→追加、単発は結果画面
3. 一覧カードに chevron が見え、タップで明細画面(読取値・形式・時刻・分割項目)→ ← で一覧へ戻る
4. 削除ボタンは明細に遷移しない
5. 横スクロールなし
