# 作業再開ボタン実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム画面にセッション永続化付きの「作業再開」ボタンを追加し、スキャナー中断後にホームから作業を再開できるようにする。

**Architecture:** `workSessionStore`（Pinia + localStorage 永続化）でセッション状態を保持。`ResumeWorkButton` はストアを監視してボタンの有効/無効・ラベルを切り替える。ScannerPage がセッションの開始・更新・終了を担う。

**Tech Stack:** Vue 3.5 (`<script setup>`), Vuetify 4.0, Pinia 3 + pinia-plugin-persistedstate, Vue Router 4

---

## ファイル構成

| ファイル | 種別 | 内容 |
|---|---|---|
| `src/stores/workSessionStore.ts` | 新規 | セッション状態管理（永続化） |
| `src/components/menu/ResumeWorkButton.vue` | 新規 | 作業再開ボタン |
| `src/pages/HomePage.vue` | 変更 | ResumeWorkButton を追加 |
| `src/pages/ScannerPage.vue` | 変更 | セッション開始・更新・終了を追加 |

**依存関係:** Task 1 → Task 2 → Task 3、Task 1 → Task 4

---

### Task 1: workSessionStore.ts — 新規作成

**Files:**
- Create: `src/stores/workSessionStore.ts`

**背景:**
- `pinia-plugin-persistedstate` は既にインストール済み（`src/plugins/index.ts` で登録済み）
- `{ persist: true }` を付けるだけで localStorage に自動保存される

- [ ] **Step 1: ファイルを作成する**

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ScannerSessionState {
  barcodes: string[]
  memo: string
}

export type WorkSessionType = 'scanner'

export interface WorkSession {
  id: string
  type: WorkSessionType
  title: string
  route: string
  startedAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
  state: ScannerSessionState
}

export const useWorkSessionStore = defineStore('workSession', () => {
  const currentSession = ref<WorkSession | null>(null)

  const hasActiveSession = computed(() => currentSession.value !== null)

  const sessionLabel = computed(() => {
    if (!currentSession.value) return '作業なし'
    return `${currentSession.value.title}を再開`
  })

  const sessionSubLabel = computed(() => {
    if (!currentSession.value) return ''
    const s = currentSession.value.state as ScannerSessionState
    const count = s.barcodes.length
    const time = new Date(currentSession.value.startedAt)
      .toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    return `${count}件 · ${time} 開始`
  })

  function startScannerSession() {
    currentSession.value = {
      id: Date.now().toString(36),
      type: 'scanner',
      title: 'スキャナー作業',
      route: '/scanner',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: { barcodes: [], memo: '' },
    }
  }

  function updateBarcodes(barcodes: string[]) {
    if (!currentSession.value) return
    const s = currentSession.value.state as ScannerSessionState
    currentSession.value.state = { ...s, barcodes }
    currentSession.value.updatedAt = new Date().toISOString()
  }

  function updateMemo(memo: string) {
    if (!currentSession.value) return
    const s = currentSession.value.state as ScannerSessionState
    currentSession.value.state = { ...s, memo }
    currentSession.value.updatedAt = new Date().toISOString()
  }

  function clearSession() {
    currentSession.value = null
  }

  return {
    currentSession,
    hasActiveSession,
    sessionLabel,
    sessionSubLabel,
    startScannerSession,
    updateBarcodes,
    updateMemo,
    clearSession,
  }
}, { persist: true })
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check
```

エラーなし（0 errors）であること。

- [ ] **Step 3: コミット**

```bash
git add src/stores/workSessionStore.ts
git commit -m "feat(session): add workSessionStore with scanner session persistence"
```

---

### Task 2: ResumeWorkButton.vue — 新規作成

**Files:**
- Create: `src/components/menu/ResumeWorkButton.vue`

**背景:**
- `workSessionStore` は Task 1 で作成済み
- QuickScannerButton (`src/components/menu/QuickScannerButton.vue`) と同じサイズ・構造に合わせる

- [ ] **Step 1: ファイルを作成する**

```vue
<template>
  <div class="resume-work-wrapper">
    <v-btn
      :color="store.hasActiveSession ? 'warning' : 'surface-variant'"
      variant="flat"
      rounded="xl"
      class="resume-work-btn"
      :disabled="!store.hasActiveSession"
      @click="onResume"
    >
      <div class="resume-work-btn__inner">
        <v-icon size="48">mdi-clipboard-play</v-icon>
        <span class="text-subtitle-1 font-weight-bold mt-2">{{ store.sessionLabel }}</span>
        <span v-if="store.hasActiveSession" class="text-caption mt-1 opacity-80">
          {{ store.sessionSubLabel }}
        </span>
      </div>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useWorkSessionStore } from '@/stores/workSessionStore'

const store = useWorkSessionStore()
const router = useRouter()

function onResume() {
  if (!store.currentSession) return
  router.push(store.currentSession.route)
}
</script>

<style scoped>
.resume-work-wrapper {
  padding: 0 24px 28px;
}
.resume-work-btn {
  width: 100%;
  min-height: 160px;
}
.resume-work-btn__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check
```

エラーなし（0 errors）であること。

- [ ] **Step 3: コミット**

```bash
git add src/components/menu/ResumeWorkButton.vue
git commit -m "feat(menu): add ResumeWorkButton component"
```

---

### Task 3: HomePage.vue — ResumeWorkButton 追加

**Files:**
- Modify: `src/pages/HomePage.vue`

**現在の `src/pages/HomePage.vue` の内容:**

```vue
<template>
  <MainLayout title="VuetifyPoC">
    <MenuGrid />
    <QuickScannerButton />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import MenuGrid from '@/components/menu/MenuGrid.vue'
import QuickScannerButton from '@/components/menu/QuickScannerButton.vue'
</script>
```

- [ ] **Step 1: ファイルを読み込む**

`src/pages/HomePage.vue` を Read ツールで読む。

- [ ] **Step 2: ResumeWorkButton を追加する**

完全な新コード:

```vue
<template>
  <MainLayout title="VuetifyPoC">
    <MenuGrid />
    <QuickScannerButton />
    <ResumeWorkButton />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import MenuGrid from '@/components/menu/MenuGrid.vue'
import QuickScannerButton from '@/components/menu/QuickScannerButton.vue'
import ResumeWorkButton from '@/components/menu/ResumeWorkButton.vue'
</script>
```

- [ ] **Step 3: 型チェック**

```bash
npm run type-check
```

エラーなし（0 errors）であること。

- [ ] **Step 4: コミット**

```bash
git add src/pages/HomePage.vue
git commit -m "feat(home): add ResumeWorkButton to home screen"
```

---

### Task 4: ScannerPage.vue — セッション連携

**Files:**
- Modify: `src/pages/ScannerPage.vue`

**背景:**
- 現在の `ScannerPage.vue` は `useScannerStore` と `useBarcodeScanner` を使用
- `onMounted(start)` で起動、`onComplete()` で `store.complete()` を呼ぶ
- continuous モード時に `results` ref にスキャン結果を蓄積

**追加する変更（最小限）:**
1. `useWorkSessionStore` を import・inject
2. `onMounted` でセッションがなければ開始
3. continuous モードのスキャン時にバーコードリストを更新
4. `onComplete()` でセッションをクリア
5. single モードのスキャン完了時もセッションをクリア

- [ ] **Step 1: ファイルを読み込む**

`src/pages/ScannerPage.vue` を Read ツールで読む。

- [ ] **Step 2: `<script setup>` を書き換える**

`<script setup lang="ts">` ブロック全体を以下に差し替える:

```ts
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useScannerStore } from '@/stores/scannerStore'
import { useWorkSessionStore } from '@/stores/workSessionStore'
import { useBarcodeScanner } from '@/composables/useBarcodeScanner'
import type { ScanResult } from '@/types/scanner'

const store = useScannerStore()
const workStore = useWorkSessionStore()
const videoRef = ref<HTMLVideoElement | null>(null)
const results = ref<ScanResult[]>([])
const torchOn = ref(false)

// Guard: prevent ZXing callback re-firing between complete() and actual unmount
let completing = false

const { start, stop, error, torchAvailable, switchTorch } = useBarcodeScanner(videoRef, {
  onScan(result) {
    if (completing) return
    if (store.mode === 'continuous') {
      results.value.push(result)
      workStore.updateBarcodes(results.value.map(r => r.text))
    } else {
      completing = true
      stop()
      workStore.clearSession()
      store.complete([result])
    }
  },
})

const cameraAreaStyle = computed(() => ({
  height: store.mode === 'continuous' ? '45%' : 'calc(100dvh - 52px)',
  flexShrink: '0',
}))

function onComplete() {
  if (completing) return
  completing = true
  stop()
  workStore.clearSession()
  store.complete([...results.value])
}

async function onToggleTorch() {
  torchOn.value = !torchOn.value
  await switchTorch(torchOn.value)
}

onMounted(() => {
  start()
  if (!workStore.currentSession) workStore.startScannerSession()
})
onUnmounted(stop)
```

- [ ] **Step 3: 型チェック**

```bash
npm run type-check
```

エラーなし（0 errors）であること。

- [ ] **Step 4: コミット**

```bash
git add src/pages/ScannerPage.vue
git commit -m "feat(scanner): integrate workSessionStore for session persistence"
```
