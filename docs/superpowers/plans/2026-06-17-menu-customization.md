# メニューカスタマイズ 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホーム画面を 3×3 アイコングリッドに変更し、設定画面からメニューの並び順と表示/非表示をカスタマイズできるようにする。

**Architecture:** Pinia ストア (`menuStore`) がマスターデータと表示設定を一元管理し、`pinia-plugin-persistedstate` で localStorage に永続化する。ホーム画面は `MenuGrid` コンポーネントがストアを読んで 3×3 グリッドを描画する。設定画面は `MenuSettingsPanel` が `vuedraggable` を使って表示中リストのドラッグ並び替えと × による非表示化を提供する。

**Tech Stack:** Vue 3, Vuetify 4, Pinia + pinia-plugin-persistedstate, vuedraggable@next (SortableJS ラッパー)

---

## ファイルマップ

| パス | 種別 | 役割 |
|---|---|---|
| `src/stores/menuStore.ts` | 新規 | マスターデータ定義 + 表示設定ストア |
| `src/components/menu/MenuGridItem.vue` | 新規 | グリッド 1 セル（アイコン＋ラベル or 空セル） |
| `src/components/menu/MenuGrid.vue` | 新規 | 3×3 グリッド全体 |
| `src/components/menu/MenuSettingsPanel.vue` | 新規 | 設定 UI（ドラッグ並び替え・× 削除・＋追加） |
| `src/pages/HomePage.vue` | 変更 | MenuGrid に置き換え |
| `src/pages/SettingsPage.vue` | 変更 | MenuSettingsPanel セクションを追加 |
| `src/plugins/index.ts` | 変更 | pinia-plugin-persistedstate を登録 |
| `.gitignore` | 変更 | `.superpowers/` を除外 |

---

## Task 1: 事前準備（.gitignore + パッケージインストール）

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: .superpowers/ を .gitignore に追加**

`.gitignore` の末尾に追記する:

```
# visual companion
.superpowers/
```

- [ ] **Step 2: パッケージをインストール**

```bash
npm install vuedraggable@next pinia-plugin-persistedstate
```

期待出力: `added N packages` (エラーなし)

- [ ] **Step 3: インストール確認**

```bash
npm ls vuedraggable pinia-plugin-persistedstate
```

期待出力: 両パッケージのバージョンが表示される

- [ ] **Step 4: コミット**

```bash
git add .gitignore package.json package-lock.json
git commit -m "chore: install vuedraggable and pinia-plugin-persistedstate"
```

---

## Task 2: pinia-plugin-persistedstate を登録

**Files:**
- Modify: `src/plugins/index.ts`

- [ ] **Step 1: plugins/index.ts を書き換え**

```ts
import vuetify from './vuetify'
import router from '@/router'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import type { App } from 'vue'

export function registerPlugins(app: App) {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
}
```

- [ ] **Step 2: 動作確認（型エラーなし）**

```bash
npm run type-check
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/plugins/index.ts
git commit -m "feat: register pinia-plugin-persistedstate"
```

---

## Task 3: menuStore を作成

**Files:**
- Create: `src/stores/menuStore.ts`

- [ ] **Step 1: ストアファイルを作成**

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface MenuItem {
  id: string
  label: string
  icon: string
  to: string
}

export const MENU_MASTER: MenuItem[] = [
  { id: 'search',    label: '商品を探す',       icon: 'mdi-magnify',        to: '/search'    },
  { id: 'favorites', label: 'お気に入り',        icon: 'mdi-heart',          to: '/favorites' },
  { id: 'settings',  label: '設定',             icon: 'mdi-cog',            to: '/settings'  },
  { id: 'samples',   label: 'コンポーネント',    icon: 'mdi-palette-swatch', to: '/samples'   },
  { id: 'scanner',   label: 'スキャナー',        icon: 'mdi-barcode-scan',   to: '/scanner'   },
]

export const useMenuStore = defineStore('menu', () => {
  const visibleIds = ref<string[]>(MENU_MASTER.map(m => m.id))

  const visibleItems = computed(() =>
    visibleIds.value
      .map(id => MENU_MASTER.find(m => m.id === id))
      .filter((m): m is MenuItem => m !== undefined)
  )

  const hiddenItems = computed(() =>
    MENU_MASTER.filter(m => !visibleIds.value.includes(m.id))
  )

  const canAddMore = computed(() => visibleIds.value.length < 9)

  function addToVisible(id: string) {
    if (!canAddMore.value || visibleIds.value.includes(id)) return
    visibleIds.value = [...visibleIds.value, id]
  }

  function removeFromVisible(id: string) {
    visibleIds.value = visibleIds.value.filter(v => v !== id)
  }

  function reorder(newIds: string[]) {
    visibleIds.value = newIds
  }

  return { visibleIds, visibleItems, hiddenItems, canAddMore, addToVisible, removeFromVisible, reorder }
}, {
  persist: true,
})
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/stores/menuStore.ts
git commit -m "feat(menu): add menuStore with persist"
```

---

## Task 4: MenuGridItem.vue を作成

**Files:**
- Create: `src/components/menu/MenuGridItem.vue`

- [ ] **Step 1: コンポーネントを作成**

```vue
<template>
  <div
    class="menu-grid-item"
    :class="{ 'menu-grid-item--clickable': !!item }"
    @click="item && emit('click')"
  >
    <div class="menu-grid-item__tile" :class="{ 'menu-grid-item__tile--empty': !item }">
      <v-icon v-if="item" :icon="item.icon" size="28" color="white" />
    </div>
    <span v-if="item" class="menu-grid-item__label">{{ item.label }}</span>
  </div>
</template>

<script setup lang="ts">
import type { MenuItem } from '@/stores/menuStore'

defineProps<{ item?: MenuItem }>()
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.menu-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.menu-grid-item--clickable {
  cursor: pointer;
}
.menu-grid-item__tile {
  width: 56px;
  height: 56px;
  background: rgb(var(--v-theme-primary));
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-grid-item__tile--empty {
  background: transparent;
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.15);
}
.menu-grid-item__label {
  font-size: 11px;
  color: rgb(var(--v-theme-on-background));
  text-align: center;
  line-height: 1.3;
  max-width: 64px;
  word-break: break-all;
}
</style>
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/menu/MenuGridItem.vue
git commit -m "feat(menu): add MenuGridItem component"
```

---

## Task 5: MenuGrid.vue を作成

**Files:**
- Create: `src/components/menu/MenuGrid.vue`

- [ ] **Step 1: コンポーネントを作成**

```vue
<template>
  <div class="menu-grid">
    <MenuGridItem
      v-for="i in 9"
      :key="i"
      :item="store.visibleItems[i - 1]"
      @click="onItemClick(i - 1)"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useMenuStore } from '@/stores/menuStore'
import MenuGridItem from './MenuGridItem.vue'

const store = useMenuStore()
const router = useRouter()

function onItemClick(index: number) {
  const item = store.visibleItems[index]
  if (item) router.push(item.to)
}
</script>

<style scoped>
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 28px 24px;
}
</style>
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/menu/MenuGrid.vue
git commit -m "feat(menu): add MenuGrid component"
```

---

## Task 6: HomePage.vue を MenuGrid に切り替え

**Files:**
- Modify: `src/pages/HomePage.vue`

- [ ] **Step 1: HomePage.vue を書き換え**

```vue
<template>
  <MainLayout title="VuetifyPoC">
    <MenuGrid />
  </MainLayout>
</template>

<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue'
import MenuGrid from '@/components/menu/MenuGrid.vue'
</script>
```

- [ ] **Step 2: 開発サーバーで動作確認**

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、以下を確認:
- ホーム画面に 3×3 グリッドが表示される
- 各アイコンをタップすると対応ページへ遷移する
- 空きセルは破線の枠として表示される

- [ ] **Step 3: コミット**

```bash
git add src/pages/HomePage.vue
git commit -m "feat(menu): replace home page cards with MenuGrid"
```

---

## Task 7: MenuSettingsPanel.vue を作成

**Files:**
- Create: `src/components/menu/MenuSettingsPanel.vue`

- [ ] **Step 1: コンポーネントを作成**

```vue
<template>
  <div>
    <!-- ミニプレビュー -->
    <p class="text-caption text-medium-emphasis mb-2">
      プレビュー（{{ store.visibleIds.length }}/9）
    </p>
    <div class="menu-preview mb-4">
      <div
        v-for="i in 9"
        :key="i"
        class="menu-preview__cell"
        :class="{ 'menu-preview__cell--filled': i <= store.visibleItems.length }"
      />
    </div>

    <v-divider class="mb-4" />

    <!-- 表示中セクション -->
    <p class="text-overline text-medium-emphasis mb-2">
      表示中（{{ store.visibleIds.length }}/9）
    </p>

    <draggable
      v-model="draggableList"
      item-key="id"
      handle=".drag-handle"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <div class="settings-item settings-item--visible">
          <v-icon size="18" class="mr-2">{{ element.icon }}</v-icon>
          <span class="text-body-2 flex-1-1">{{ element.label }}</span>
          <v-btn
            icon
            size="x-small"
            variant="text"
            class="mr-1"
            @click="store.removeFromVisible(element.id)"
          >
            <v-icon size="16">mdi-close</v-icon>
          </v-btn>
          <v-icon class="drag-handle" size="20" style="opacity:0.4;cursor:grab;">
            mdi-drag
          </v-icon>
        </div>
      </template>
    </draggable>

    <p v-if="store.visibleItems.length === 0" class="text-caption text-medium-emphasis pa-3">
      表示中のメニューがありません
    </p>

    <v-divider class="my-4" />

    <!-- 非表示セクション -->
    <p class="text-overline text-medium-emphasis mb-2">非表示</p>

    <div v-if="store.hiddenItems.length > 0" class="d-flex flex-column gap-1">
      <div
        v-for="item in store.hiddenItems"
        :key="item.id"
        class="settings-item settings-item--hidden"
      >
        <v-icon size="18" class="mr-2" style="opacity:0.4;">{{ item.icon }}</v-icon>
        <span class="text-body-2 flex-1-1" style="opacity:0.5;">{{ item.label }}</span>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          :disabled="!store.canAddMore"
          @click="store.addToVisible(item.id)"
        >
          <v-tooltip v-if="!store.canAddMore" activator="parent" location="top">
            最大 9 個
          </v-tooltip>
          ＋追加
        </v-btn>
      </div>
    </div>

    <p v-else class="text-caption text-medium-emphasis pa-3">
      非表示のメニューはありません
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { useMenuStore } from '@/stores/menuStore'
import type { MenuItem } from '@/stores/menuStore'

const store = useMenuStore()

const draggableList = ref<MenuItem[]>([...store.visibleItems])

watch(
  () => store.visibleItems,
  (items) => { draggableList.value = [...items] },
  { deep: true }
)

function onDragEnd() {
  store.reorder(draggableList.value.map(m => m.id))
}
</script>

<style scoped>
.menu-preview {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 4px;
}
.menu-preview__cell {
  aspect-ratio: 1;
  border-radius: 4px;
  border: 1.5px dashed rgba(var(--v-theme-on-surface), 0.2);
}
.menu-preview__cell--filled {
  background: rgb(var(--v-theme-primary));
  border: none;
  opacity: 0.8;
}

.settings-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 2px;
}
.settings-item--visible {
  background: rgba(var(--v-theme-primary), 0.08);
  border-left: 3px solid rgb(var(--v-theme-primary));
}
.settings-item--hidden {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-left: 3px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/menu/MenuSettingsPanel.vue
git commit -m "feat(menu): add MenuSettingsPanel with drag reorder"
```

---

## Task 8: SettingsPage.vue にメニュー設定セクションを追加

**Files:**
- Modify: `src/pages/SettingsPage.vue`

- [ ] **Step 1: SettingsPage.vue を編集**

`<script setup>` に import を追加:

```ts
import MenuSettingsPanel from '@/components/menu/MenuSettingsPanel.vue'
```

テンプレートの `<!-- その他設定（プレースホルダー） -->` セクションの**前**（`<v-divider class="mb-6" />` の直後）に追加:

```vue
<!-- メニューカスタマイズ -->
<p class="text-overline text-medium-emphasis mb-3">メニューカスタマイズ</p>
<MenuSettingsPanel />

<v-divider class="my-6" />
```

- [ ] **Step 2: 開発サーバーで動作確認**

```bash
npm run dev
```

設定画面（`/settings`）を開き、以下を確認:
- 「メニューカスタマイズ」セクションが表示される
- ミニプレビュー（9 マス）が表示される
- 表示中リストの `≡` ハンドルをドラッグすると順番が変わる
- ホーム画面に戻るとグリッドの並びが変わっている
- `×` ボタンで項目が非表示セクションに移動する
- 非表示の `＋追加` ボタンで表示中に戻る
- 表示中が 9 個のとき `＋追加` が無効になり「最大 9 個」ツールチップが出る
- ページをリロードしても設定が維持される（localStorage 確認）

- [ ] **Step 3: コミット**

```bash
git add src/pages/SettingsPage.vue
git commit -m "feat(menu): add menu customization section to SettingsPage"
```

---

## 完了チェックリスト

- [ ] ホーム画面が 3×3 アイコングリッドで表示される
- [ ] 空きセルが破線の枠で表示される
- [ ] アイコンタップで対応ページへ遷移する
- [ ] 設定画面にメニューカスタマイズセクションが表示される
- [ ] ドラッグ並び替えがホーム画面に即時反映される
- [ ] × で非表示、＋追加で表示に戻る
- [ ] 9 個上限でツールチップが出て追加不可になる
- [ ] リロード後も設定が保持される
- [ ] ライト・ダーク・practice 各テーマで見た目が崩れない
