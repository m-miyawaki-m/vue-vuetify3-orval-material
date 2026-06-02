# Vue + Vuetify3 + Capacitor Android PoC 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vue3 + Vuetify3 + Capacitor を使ったAndroid向けモックUIアプリをビルドし、エミュレーターで動作確認する

**Architecture:** `npm create vuetify@latest` でスキャフォールド後、型定義・モックデータ・Piniaストア・3画面（Menu/Search/Detail）を実装し、Capacitorでラップして `npx cap open android` でビルドを検証する。ルーターはCapacitor互換の `createWebHashHistory` を使用。

**Tech Stack:** Vue 3 + TypeScript, Vuetify 3, Vue Router 4 (createWebHashHistory), Pinia, material-icons (npm), Capacitor 6 + @capacitor/android, Vite 5

---

### Task 1: プロジェクトスキャフォールドと初期確認

**Files:**
- Create: プロジェクト全体（scaffold生成）

- [ ] **Step 1: 親ディレクトリでスキャフォールドを実行**

PowerShellで実行：
```powershell
cd "C:\Users\miyaw\OneDrive\ドキュメント\dev"
npm create vuetify@latest
```

対話プロンプトで以下を選択：
```
? Project name:              vue-vuetify3-orval-material
? Which preset:              Default (Vuetify)
? Use TypeScript?            Yes
? Install dependencies with: npm
```

- [ ] **Step 2: 生成されたsrc/以下のファイル構成を確認してメモする**

```powershell
cd vue-vuetify3-orval-material
Get-ChildItem -Recurse src | Where-Object { !$_.PSIsContainer } | Select-Object FullName
```

後続タスクで判断が必要なため以下を確認：
- `src/store/` か `src/stores/` どちらか
- `src/router/index.ts` が存在するか
- `src/plugins/router.ts` が存在するか（unplugin-vue-router使用の可能性）

- [ ] **Step 3: 開発サーバーで動作確認**

```powershell
npm run dev
```

`http://localhost:3000` にアクセスしてVuetifyのデフォルト画面が表示されることを確認後、`Ctrl+C` で停止。

- [ ] **Step 4: git初期化とコミット**

```powershell
git init
git add .
git commit -m "chore: initial scaffold from npm create vuetify@latest"
```

---

### Task 2: 追加パッケージのインストール

**Files:**
- Modify: `package.json`（npm installで自動更新）

- [ ] **Step 1: material-icons と Capacitor をインストール**

```powershell
npm install material-icons
npm install @capacitor/core @capacitor/cli @capacitor/android
```

- [ ] **Step 2: インストール確認**

```powershell
npm list material-icons @capacitor/core @capacitor/cli @capacitor/android --depth=0
```

Expected（バージョンは異なってよい）:
```
├── @capacitor/android@6.x.x
├── @capacitor/cli@6.x.x
├── @capacitor/core@6.x.x
└── material-icons@x.x.x
```

- [ ] **Step 3: コミット**

```powershell
git add package.json package-lock.json
git commit -m "chore: add material-icons and capacitor packages"
```

---

### Task 3: 設定ファイルの修正

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/plugins/vuetify.ts`
- Modify: `src/main.ts`
- Create: `capacitor.config.ts`

- [ ] **Step 1: `vite.config.ts` を以下の内容に置き換える**

（`base: './'` がCapacitorに必要。他は scaffold 生成内容をベースに保持）

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    vuetify({
      autoImport: true,
    }),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },
  server: {
    port: 3000,
  },
})
```

- [ ] **Step 2: `src/plugins/vuetify.ts` を以下の内容に置き換える**

```ts
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
})
```

- [ ] **Step 3: `src/main.ts` を以下の内容に置き換える**

```ts
import 'material-icons/iconfont/material-icons.css'
import { registerPlugins } from '@/plugins'
import App from './App.vue'
import { createApp } from 'vue'

const app = createApp(App)
registerPlugins(app)
app.mount('#app')
```

- [ ] **Step 4: `capacitor.config.ts` をプロジェクトルートに作成**

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.example.myapp',
  appName: 'VuetifyPoC',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
```

- [ ] **Step 5: 動作確認**

```powershell
npm run dev
```

`http://localhost:3000` でデフォルト画面が引き続き表示されることを確認後、`Ctrl+C` で停止。

- [ ] **Step 6: コミット**

```powershell
git add vite.config.ts src/plugins/vuetify.ts src/main.ts capacitor.config.ts
git commit -m "chore: configure vite base path, material-icons, vuetify icons, capacitor"
```

---

### Task 4: スキャフォールドのボイラープレート整理とルーター設定

**Files:**
- Replace: `src/App.vue`
- Delete: `src/components/HelloWorld.vue`（存在する場合）
- Delete: `src/store/app.ts` または `src/stores/app.ts`（存在する場合）
- Replace/Create: `src/router/index.ts`
- Replace/Create: `src/plugins/index.ts`
- Create (placeholder): `src/pages/MenuPage.vue`, `src/pages/SearchPage.vue`, `src/pages/DetailPage.vue`

- [ ] **Step 1: ボイラープレートを削除**

```powershell
Remove-Item -Force src/components/HelloWorld.vue -ErrorAction SilentlyContinue
Remove-Item -Force src/store/app.ts -ErrorAction SilentlyContinue
Remove-Item -Force src/stores/app.ts -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force src/pages -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force src/layouts -ErrorAction SilentlyContinue
```

- [ ] **Step 2: `src/App.vue` を最小構成に置き換え**

```vue
<template>
  <v-app>
    <router-view />
  </v-app>
</template>
```

- [ ] **Step 3: `src/router/index.ts` を作成（または置き換え）**

`src/router/` ディレクトリが存在しない場合は作成：
```powershell
New-Item -ItemType Directory -Force src/router
```

`src/router/index.ts` を作成：
```ts
import { createRouter, createWebHashHistory } from 'vue-router'
import MenuPage from '@/pages/MenuPage.vue'
import SearchPage from '@/pages/SearchPage.vue'
import DetailPage from '@/pages/DetailPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: MenuPage },
    { path: '/search', component: SearchPage },
    { path: '/detail/:id', component: DetailPage, props: true },
  ],
})

export default router
```

> `createWebHashHistory` を使う理由：Capacitorはfile://プロトコルでアセットを提供する場合があるため、HTML5 history APIより安全。

- [ ] **Step 4: `src/plugins/index.ts` を以下の内容に置き換える**

```ts
import vuetify from './vuetify'
import router from '@/router'
import { createPinia } from 'pinia'
import type { App } from 'vue'

export function registerPlugins(app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(createPinia())
}
```

- [ ] **Step 5: `src/pages/` にプレースホルダーページを作成**

```powershell
New-Item -ItemType Directory -Force src/pages
```

`src/pages/MenuPage.vue`:
```vue
<template>
  <div>MenuPage placeholder</div>
</template>
```

`src/pages/SearchPage.vue`:
```vue
<template>
  <div>SearchPage placeholder</div>
</template>
```

`src/pages/DetailPage.vue`:
```vue
<script setup lang="ts">
defineProps<{ id: string }>()
</script>
<template>
  <div>DetailPage placeholder (id={{ id }})</div>
</template>
```

- [ ] **Step 6: 動作確認**

```powershell
npm run dev
```

`http://localhost:3000` で "MenuPage placeholder" が表示され、`http://localhost:3000/#/search` で "SearchPage placeholder" が表示されることを確認。`Ctrl+C` で停止。

- [ ] **Step 7: コミット**

```powershell
git add -A
git commit -m "chore: clean up boilerplate, set up manual router with page placeholders"
```

---

### Task 5: 型定義の作成

**Files:**
- Create: `src/types/product.ts`

- [ ] **Step 1: `src/types/` を作成して型定義を書く**

```powershell
New-Item -ItemType Directory -Force src/types
```

`src/types/product.ts`:
```ts
export type ProductCategory = '食品' | '電子機器' | 'ファッション' | '家具' | 'スポーツ'

export interface Review {
  id: number
  author: string
  rating: number
  comment: string
}

export interface Product {
  id: number
  name: string
  category: ProductCategory
  price: number
  inStock: boolean
  description: string
  rating: number
  reviews: Review[]
}
```

- [ ] **Step 2: コミット**

```powershell
git add src/types/product.ts
git commit -m "feat: add Product and Review type definitions"
```

---

### Task 6: モックデータの作成

**Files:**
- Create: `src/mocks/products.ts`

- [ ] **Step 1: `src/mocks/` を作成してモックデータを書く**

```powershell
New-Item -ItemType Directory -Force src/mocks
```

`src/mocks/products.ts`（50件・5カテゴリ×10件）:
```ts
import type { Product } from '@/types/product'

export const mockProducts: Product[] = [
  // 食品 (1-10)
  { id: 1, name: 'オーガニック緑茶', category: '食品', price: 1200, inStock: true, description: '厳選された国産茶葉を使用した風味豊かな緑茶。', rating: 4, reviews: [{ id: 1, author: '田中太郎', rating: 5, comment: '香りが良く飲みやすいです。' }, { id: 2, author: '鈴木花子', rating: 3, comment: '普通です。値段の割に量が少ない。' }] },
  { id: 2, name: '天然蜂蜜', category: '食品', price: 2500, inStock: true, description: '国産百花蜜。添加物一切不使用の純粋蜂蜜。', rating: 5, reviews: [{ id: 3, author: '山田一郎', rating: 5, comment: '濃厚で美味しい！リピート確定。' }] },
  { id: 3, name: '玄米ご飯パック', category: '食品', price: 800, inStock: false, description: '無農薬栽培の玄米を使った電子レンジ対応パック。', rating: 3, reviews: [{ id: 4, author: '佐藤美咲', rating: 3, comment: '味は普通ですが便利です。' }] },
  { id: 4, name: 'プレミアムコーヒー豆', category: '食品', price: 3200, inStock: true, description: 'エチオピア産シングルオリジン。フルーティーな香り。', rating: 5, reviews: [{ id: 5, author: '伊藤健', rating: 5, comment: '香りが素晴らしい。' }, { id: 6, author: '渡辺直子', rating: 4, comment: '少し酸味が強いが美味しい。' }] },
  { id: 5, name: '有機オリーブオイル', category: '食品', price: 1800, inStock: true, description: 'スペイン産有機オリーブオイル。エクストラバージン。', rating: 4, reviews: [{ id: 7, author: '中村浩', rating: 4, comment: 'さらっとして料理に使いやすい。' }] },
  { id: 6, name: '国産蕎麦粉', category: '食品', price: 950, inStock: true, description: '北海道産100%蕎麦粉。石臼挽きで風味豊か。', rating: 4, reviews: [{ id: 8, author: '小林由美', rating: 4, comment: '手打ち蕎麦が美味しく作れました。' }] },
  { id: 7, name: '天然塩', category: '食品', price: 600, inStock: false, description: '沖縄の海水から作られたミネラル豊富な天然塩。', rating: 3, reviews: [{ id: 9, author: '加藤信二', rating: 3, comment: 'まろやかな塩味で良いです。' }] },
  { id: 8, name: 'ドライフルーツミックス', category: '食品', price: 1500, inStock: true, description: 'ノンオイル・ノンシュガーのドライフルーツ詰め合わせ。', rating: 4, reviews: [{ id: 10, author: '松本早紀', rating: 5, comment: 'おやつに最適。' }, { id: 11, author: '井上剛', rating: 3, comment: '量が少し少ない。' }] },
  { id: 9, name: '玄米茶', category: '食品', price: 900, inStock: true, description: '香ばしい玄米と緑茶のブレンド。ほうじ茶感覚で飲める。', rating: 4, reviews: [{ id: 12, author: '木村奈緒', rating: 4, comment: '香ばしくて飲みやすい。' }] },
  { id: 10, name: '手作りジャムセット', category: '食品', price: 2200, inStock: false, description: 'いちご・ブルーベリー・マーマレードの3本セット。', rating: 5, reviews: [{ id: 13, author: '林美子', rating: 5, comment: '贈り物に最適。とても喜ばれました。' }] },

  // 電子機器 (11-20)
  { id: 11, name: 'ワイヤレスイヤホン', category: '電子機器', price: 8900, inStock: true, description: 'Bluetooth 5.3対応。最大30時間再生。IPX5防水。', rating: 4, reviews: [{ id: 14, author: '田中誠', rating: 5, comment: '音質が良くてコスパ最高。' }, { id: 15, author: '鈴木良子', rating: 3, comment: 'フィット感がもう少し欲しい。' }] },
  { id: 12, name: 'モバイルバッテリー20000mAh', category: '電子機器', price: 5500, inStock: true, description: 'PD対応65W急速充電。薄型コンパクト設計。', rating: 4, reviews: [{ id: 16, author: '山本隆', rating: 4, comment: '軽くて持ち歩きやすい。' }] },
  { id: 13, name: 'スマートウォッチ', category: '電子機器', price: 15800, inStock: false, description: '健康管理・GPS搭載。防水仕様で日常使い最適。', rating: 4, reviews: [{ id: 17, author: '中島直美', rating: 5, comment: '毎日使っています。' }, { id: 18, author: '佐々木明', rating: 3, comment: 'バッテリーの持ちが悪い。' }] },
  { id: 14, name: 'USBハブ 7ポート', category: '電子機器', price: 3200, inStock: true, description: 'USB-A×4 + USB-C×2 + HDMI×1。アルミ製。', rating: 4, reviews: [{ id: 19, author: '高橋俊介', rating: 4, comment: 'MacBookで問題なく使えています。' }] },
  { id: 15, name: 'メカニカルキーボード', category: '電子機器', price: 12000, inStock: true, description: '赤軸採用。RGBバックライト搭載のコンパクト65%キーボード。', rating: 5, reviews: [{ id: 20, author: '岡田博', rating: 5, comment: '打鍵感が最高。' }] },
  { id: 16, name: 'ウェブカメラ4K', category: '電子機器', price: 7800, inStock: true, description: '4K@30fps対応。ノイズキャンセリングマイク内蔵。', rating: 4, reviews: [{ id: 21, author: '藤田恵', rating: 4, comment: '画質が良くてZoom会議で重宝。' }] },
  { id: 17, name: 'SSDポータブル 1TB', category: '電子機器', price: 9800, inStock: false, description: 'USB3.2 Gen2対応。読込1050MB/s。耐衝撃設計。', rating: 5, reviews: [{ id: 22, author: '川口達也', rating: 5, comment: '爆速で驚き。コンパクトで持ち運びやすい。' }] },
  { id: 18, name: '液晶モニター 27インチ', category: '電子機器', price: 32000, inStock: true, description: '4K IPS。リフレッシュレート144Hz。HDR対応。', rating: 4, reviews: [{ id: 23, author: '石川雄太', rating: 4, comment: '発色が良い。' }, { id: 24, author: '坂本彩', rating: 4, comment: 'スタンド調整範囲が広くて使いやすい。' }] },
  { id: 19, name: 'スピーカー Bluetooth', category: '電子機器', price: 6500, inStock: true, description: '360度サウンド。防水IPX7。最大12時間再生。', rating: 4, reviews: [{ id: 25, author: '杉山雅人', rating: 4, comment: '音が迫力あって満足。' }] },
  { id: 20, name: 'ゲームパッド', category: '電子機器', price: 4900, inStock: false, description: 'PC/スマートフォン対応。有線/無線切り替え可能。', rating: 3, reviews: [{ id: 26, author: '前田光一', rating: 3, comment: 'ボタンの反応が少し遅い気がする。' }] },

  // ファッション (21-30)
  { id: 21, name: 'コットンTシャツ', category: 'ファッション', price: 2800, inStock: true, description: '100%オーガニックコットン。シンプルなクルーネック。', rating: 4, reviews: [{ id: 27, author: '吉田真由美', rating: 4, comment: '肌触りが良くて気持ちいい。' }] },
  { id: 22, name: 'デニムジャケット', category: 'ファッション', price: 9800, inStock: true, description: 'ヴィンテージウォッシュ加工。M〜XLサイズ展開。', rating: 4, reviews: [{ id: 28, author: '服部大輔', rating: 5, comment: 'デザインが気に入っています。' }, { id: 29, author: '西村亮', rating: 3, comment: 'サイズ感が少し小さめ。' }] },
  { id: 23, name: 'ウールマフラー', category: 'ファッション', price: 4500, inStock: false, description: '上質なメリノウール100%。柔らかく暖かい。', rating: 5, reviews: [{ id: 30, author: '村田悠', rating: 5, comment: '肌触りが素晴らしい。毎冬使っています。' }] },
  { id: 24, name: 'スニーカー', category: 'ファッション', price: 12000, inStock: true, description: 'キャンバス素材。クラシックなデザイン。', rating: 4, reviews: [{ id: 31, author: '橋本さやか', rating: 4, comment: '軽くて歩きやすい。' }] },
  { id: 25, name: 'カシミヤセーター', category: 'ファッション', price: 18000, inStock: true, description: 'モンゴル産カシミヤ100%。繊細で軽く暖かい。', rating: 5, reviews: [{ id: 32, author: '長谷川純', rating: 5, comment: '高級感があって着心地抜群。' }] },
  { id: 26, name: 'レインコート', category: 'ファッション', price: 7200, inStock: true, description: '完全防水・透湿性素材。コンパクトに収納可能。', rating: 4, reviews: [{ id: 33, author: '清水健二', rating: 4, comment: '折りたたんでカバンに入れられて便利。' }] },
  { id: 27, name: 'ストレッチスラックス', category: 'ファッション', price: 6800, inStock: false, description: 'ストレッチ素材。ビジネスにもカジュアルにも。', rating: 3, reviews: [{ id: 34, author: '近藤雄介', rating: 3, comment: 'シルエットが思ったより太め。' }] },
  { id: 28, name: 'レザーベルト', category: 'ファッション', price: 3500, inStock: true, description: '本革製。35mmワイド。ビジネス・カジュアル兼用。', rating: 4, reviews: [{ id: 35, author: '和田亮太', rating: 4, comment: '質感が良く値段以上の品質。' }] },
  { id: 29, name: 'キャップ', category: 'ファッション', price: 2200, inStock: true, description: 'コットンツイル素材。アジャスタブルストラップ付き。', rating: 4, reviews: [{ id: 36, author: '福田彩香', rating: 4, comment: 'どんな服にも合わせやすい。' }] },
  { id: 30, name: 'サングラス', category: 'ファッション', price: 8500, inStock: false, description: 'UV400カット。軽量チタンフレーム。偏光レンズ。', rating: 4, reviews: [{ id: 37, author: '池田賢一', rating: 4, comment: 'レンズが見やすく目が疲れにくい。' }] },

  // 家具 (31-40)
  { id: 31, name: 'ワークデスク 120cm', category: '家具', price: 24000, inStock: true, description: '在宅ワークに最適。引き出し2杯付きで収納充実。', rating: 4, reviews: [{ id: 38, author: '斎藤翔太', rating: 4, comment: '組み立てやすく安定感がある。' }, { id: 39, author: '吉川恵美', rating: 4, comment: '広くて使いやすい。' }] },
  { id: 32, name: 'アームチェア', category: '家具', price: 38000, inStock: true, description: '高反発ウレタン使用。腰への負担を軽減。ランバーサポート付き。', rating: 5, reviews: [{ id: 40, author: '内田卓也', rating: 5, comment: '腰痛が改善されました。' }] },
  { id: 33, name: '本棚 5段', category: '家具', price: 15000, inStock: false, description: '棚板高さ調整可能。スリムなA4対応本棚。', rating: 4, reviews: [{ id: 41, author: '大野裕子', rating: 4, comment: 'シンプルで使いやすい。' }] },
  { id: 34, name: 'ソファ 2人掛け', category: '家具', price: 55000, inStock: true, description: 'ファブリック素材。コンパクトで1Kにも置ける。', rating: 4, reviews: [{ id: 42, author: '中川誠', rating: 5, comment: '座り心地が良い。' }, { id: 43, author: '田中恵', rating: 3, comment: '組み立てが一人では大変。' }] },
  { id: 35, name: 'コーヒーテーブル', category: '家具', price: 18000, inStock: true, description: '天板：天然木突板。脚部：スチール。北欧テイスト。', rating: 4, reviews: [{ id: 44, author: '山口達夫', rating: 4, comment: 'デザインがおしゃれ。' }] },
  { id: 36, name: 'テレビボード 140cm', category: '家具', price: 28000, inStock: false, description: '扉付き収納×2。配線隠し機能付き。', rating: 4, reviews: [{ id: 45, author: '小川薫', rating: 4, comment: '収納力があって部屋がすっきりした。' }] },
  { id: 37, name: '折りたたみベッド', category: '家具', price: 19000, inStock: true, description: 'シングルサイズ。使わないときはコンパクトに収納可能。', rating: 3, reviews: [{ id: 46, author: '石原大樹', rating: 3, comment: '来客用に購入。使い勝手は普通。' }] },
  { id: 38, name: 'キャビネット 引き出し6杯', category: '家具', price: 22000, inStock: true, description: 'A4書類対応。スチール製で耐久性高い。', rating: 4, reviews: [{ id: 47, author: '河野真一', rating: 4, comment: '引き出しの動きが滑らかで良い。' }] },
  { id: 39, name: 'フロアランプ', category: '家具', price: 8500, inStock: true, description: '3段階調光。スリムなポール型。読書灯として最適。', rating: 4, reviews: [{ id: 48, author: '中西美穂', rating: 4, comment: '明るさ調整ができて便利。' }] },
  { id: 40, name: 'ラグ 185×185cm', category: '家具', price: 12000, inStock: false, description: 'ふわふわのマイクロファイバー素材。洗濯機OK。', rating: 4, reviews: [{ id: 49, author: '青木裕樹', rating: 4, comment: '肌触りが良く子どもが喜んでいます。' }] },

  // スポーツ (41-50)
  { id: 41, name: 'ヨガマット 6mm', category: 'スポーツ', price: 3800, inStock: true, description: '滑り止め加工。軽量&収納袋付き。環境配慮素材。', rating: 4, reviews: [{ id: 50, author: '村上祐子', rating: 5, comment: 'クッションがちょうど良い厚さ。' }, { id: 51, author: '福島勝', rating: 3, comment: '折り目がつきやすい。' }] },
  { id: 42, name: 'ダンベルセット 20kg', category: 'スポーツ', price: 9800, inStock: true, description: '可変式ダンベル。2.5kg〜20kgまで調整可能。', rating: 4, reviews: [{ id: 52, author: '金子俊也', rating: 4, comment: '調整が簡単でスペースを取らない。' }] },
  { id: 43, name: 'ランニングシューズ', category: 'スポーツ', price: 11000, inStock: false, description: '軽量メッシュアッパー。反発性の高いミッドソール。', rating: 5, reviews: [{ id: 53, author: '木下浩介', rating: 5, comment: '走りやすくてPBが出ました。' }] },
  { id: 44, name: 'プロテインシェイカー', category: 'スポーツ', price: 1500, inStock: true, description: '700ml。目盛り付き。食洗機OK。BPAフリー。', rating: 4, reviews: [{ id: 54, author: '池上達彦', rating: 4, comment: '蓋が漏れず使いやすい。' }] },
  { id: 45, name: 'トレーニングバンドセット', category: 'スポーツ', price: 2800, inStock: true, description: '5段階の強度。全身トレーニングに対応。', rating: 4, reviews: [{ id: 55, author: '上田美樹', rating: 4, comment: '家でのトレーニングに重宝。' }] },
  { id: 46, name: 'バドミントンセット', category: 'スポーツ', price: 4500, inStock: true, description: 'ラケット2本・シャトル6個・ネットのセット。', rating: 3, reviews: [{ id: 56, author: '永田浩二', rating: 3, comment: 'シャトルがすぐに壊れた。ラケットは良い。' }] },
  { id: 47, name: 'スポーツタオル速乾', category: 'スポーツ', price: 1800, inStock: true, description: 'マイクロファイバー素材。速乾・抗菌加工。', rating: 4, reviews: [{ id: 57, author: '浜田恭子', rating: 4, comment: '乾きが早くジムで重宝。' }] },
  { id: 48, name: 'ジャンピングロープ', category: 'スポーツ', price: 2200, inStock: false, description: 'ベアリング入りで絡まりにくい。長さ調節可能。', rating: 4, reviews: [{ id: 58, author: '田村進一', rating: 4, comment: 'スムーズに回せて跳びやすい。' }] },
  { id: 49, name: 'プッシュアップバー', category: 'スポーツ', price: 1900, inStock: true, description: '回転式で手首に優しい。ゴム製非滑り底。', rating: 5, reviews: [{ id: 59, author: '中田勇気', rating: 5, comment: '胸への刺激が増えました。コスパ最高。' }] },
  { id: 50, name: 'フォームローラー', category: 'スポーツ', price: 3200, inStock: true, description: '高密度EPE素材。筋膜リリース・ストレッチに最適。', rating: 4, reviews: [{ id: 60, author: '長田美奈子', rating: 4, comment: '運動後のケアに使っています。' }] },
]
```

- [ ] **Step 2: コミット**

```powershell
git add src/mocks/products.ts
git commit -m "feat: add 50 mock products across 5 categories"
```

---

### Task 7: Pinia ストアの作成

**Files:**
- Create: `src/stores/product.ts`

- [ ] **Step 1: `src/stores/` を作成してストアを書く**

```powershell
New-Item -ItemType Directory -Force src/stores
```

`src/stores/product.ts`:
```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product } from '@/types/product'
import { mockProducts } from '@/mocks/products'

const PAGE_SIZE = 5

export const useProductStore = defineStore('product', () => {
  const products = ref<Product[]>(mockProducts)
  const keyword = ref('')
  const selectedCategory = ref('')
  const inStockOnly = ref(false)
  const currentPage = ref(1)
  const selectedProduct = ref<Product | null>(null)

  const filteredProducts = computed(() =>
    products.value.filter(p => {
      const matchKeyword = !keyword.value
        || p.name.includes(keyword.value)
        || p.description.includes(keyword.value)
      const matchCategory = !selectedCategory.value || p.category === selectedCategory.value
      const matchStock = !inStockOnly.value || p.inStock
      return matchKeyword && matchCategory && matchStock
    })
  )

  const totalPages = computed(() =>
    Math.ceil(filteredProducts.value.length / PAGE_SIZE)
  )

  const pagedProducts = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredProducts.value.slice(start, start + PAGE_SIZE)
  })

  function resetPage() {
    currentPage.value = 1
  }

  function selectProduct(product: Product) {
    selectedProduct.value = product
  }

  return {
    products,
    keyword,
    selectedCategory,
    inStockOnly,
    currentPage,
    selectedProduct,
    filteredProducts,
    totalPages,
    pagedProducts,
    resetPage,
    selectProduct,
  }
})
```

- [ ] **Step 2: `src/plugins/index.ts` でpiniaがcreatePinia()で登録されているか確認**

Task 4 で設定した `src/plugins/index.ts` の `createPinia()` が `app.use()` に渡されていることを確認する。

- [ ] **Step 3: コミット**

```powershell
git add src/stores/product.ts
git commit -m "feat: add product Pinia store with filtering and pagination"
```

---

### Task 8: 共通レイアウトコンポーネント

**Files:**
- Create: `src/components/layout/AppHeader.vue`
- Create: `src/components/layout/AppFooter.vue`

- [ ] **Step 1: `src/components/layout/` を作成**

```powershell
New-Item -ItemType Directory -Force src/components/layout
```

- [ ] **Step 2: `src/components/layout/AppHeader.vue` を作成**

```vue
<template>
  <v-app-bar color="primary" elevation="2">
    <template v-if="showBack" #prepend>
      <v-btn icon @click="router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
    </template>
    <v-app-bar-title>{{ title }}</v-app-bar-title>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

withDefaults(defineProps<{
  title: string
  showBack?: boolean
}>(), { showBack: false })

const router = useRouter()
</script>
```

- [ ] **Step 3: `src/components/layout/AppFooter.vue` を作成**

```vue
<template>
  <v-footer color="primary" class="d-flex justify-center pa-2">
    <span class="text-caption text-white">© 2026 VuetifyPoC</span>
  </v-footer>
</template>
```

- [ ] **Step 4: コミット**

```powershell
git add src/components/layout/
git commit -m "feat: add AppHeader and AppFooter layout components"
```

---

### Task 9: 商品コンポーネントの作成

**Files:**
- Create: `src/components/product/ProductCard.vue`
- Create: `src/components/product/ProductDialog.vue`

- [ ] **Step 1: `src/components/product/` を作成**

```powershell
New-Item -ItemType Directory -Force src/components/product
```

- [ ] **Step 2: `src/components/product/ProductCard.vue` を作成**

```vue
<template>
  <v-card class="mb-3" @click="emit('click', product)">
    <v-card-title class="text-body-1 font-weight-bold">{{ product.name }}</v-card-title>
    <v-card-subtitle>{{ product.category }}</v-card-subtitle>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-2">
        <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
        <v-chip
          :color="product.inStock ? 'success' : 'error'"
          size="small"
          variant="tonal"
        >
          {{ product.inStock ? '在庫あり' : '在庫なし' }}
        </v-chip>
      </div>
      <v-rating
        :model-value="product.rating"
        density="compact"
        readonly
        size="small"
        color="amber"
        class="mb-1"
      />
      <p class="text-body-2 text-medium-emphasis">{{ product.description }}</p>
    </v-card-text>
    <v-card-actions>
      <v-btn
        variant="text"
        color="primary"
        @click.stop="emit('detail', product)"
      >
        詳細を見る
        <v-icon end>mdi-chevron-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'

defineProps<{ product: Product }>()
const emit = defineEmits<{
  click: [product: Product]
  detail: [product: Product]
}>()
</script>
```

- [ ] **Step 3: `src/components/product/ProductDialog.vue` を作成**

```vue
<template>
  <v-dialog v-model="model" max-width="500">
    <v-card v-if="product">
      <v-card-title>{{ product.name }}</v-card-title>
      <v-card-subtitle>{{ product.category }}</v-card-subtitle>
      <v-card-text>
        <div class="d-flex align-center ga-2 mb-3">
          <span class="text-h6">¥{{ product.price.toLocaleString() }}</span>
          <v-chip
            :color="product.inStock ? 'success' : 'error'"
            variant="tonal"
          >
            {{ product.inStock ? '在庫あり' : '在庫なし' }}
          </v-chip>
        </div>
        <v-rating
          :model-value="product.rating"
          readonly
          color="amber"
          class="mb-3"
        />
        <p>{{ product.description }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">閉じる</v-btn>
        <v-btn color="primary" variant="elevated" @click="onDetail">詳細を見る</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Product } from '@/types/product'

const model = defineModel<boolean>()
const props = defineProps<{ product: Product | null }>()
const emit = defineEmits<{ detail: [product: Product] }>()

function onDetail() {
  if (props.product) emit('detail', props.product)
}
</script>
```

- [ ] **Step 4: コミット**

```powershell
git add src/components/product/
git commit -m "feat: add ProductCard and ProductDialog components"
```

---

### Task 10: MenuPage の実装

**Files:**
- Replace: `src/pages/MenuPage.vue`

- [ ] **Step 1: `src/pages/MenuPage.vue` を以下の内容に置き換える**

```vue
<template>
  <v-layout>
    <AppHeader title="VuetifyPoC" />
    <v-main>
      <v-container class="py-6">
        <v-row>
          <v-col cols="12">
            <h1 class="text-h5 mb-4">メニュー</h1>
          </v-col>
          <v-col
            v-for="item in menuItems"
            :key="item.title"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              :disabled="!item.to"
              @click="item.to ? router.push(item.to) : undefined"
            >
              <v-card-title>
                <v-icon class="mr-2">{{ item.icon }}</v-icon>
                {{ item.title }}
              </v-card-title>
              <v-card-text>{{ item.description }}</v-card-text>
              <v-card-actions>
                <v-btn
                  :color="item.to ? 'primary' : undefined"
                  variant="text"
                  :disabled="!item.to"
                >
                  {{ item.to ? '開く' : '準備中' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <AppFooter />
  </v-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const router = useRouter()

const menuItems = [
  {
    title: '商品を探す',
    icon: 'mdi-magnify',
    description: '商品の検索・絞り込みができます',
    to: '/search',
  },
  {
    title: 'お気に入り',
    icon: 'mdi-heart',
    description: 'お気に入り商品の一覧（ダミー）',
    to: '',
  },
  {
    title: '設定',
    icon: 'mdi-cog',
    description: 'アプリの設定（ダミー）',
    to: '',
  },
]
</script>
```

- [ ] **Step 2: ブラウザで動作確認**

```powershell
npm run dev
```

`http://localhost:3000` でメニューカードが3枚表示され、「商品を探す」クリックで `/search` に遷移することを確認。`Ctrl+C` で停止。

- [ ] **Step 3: コミット**

```powershell
git add src/pages/MenuPage.vue
git commit -m "feat: implement MenuPage with navigation cards"
```

---

### Task 11: SearchPage の実装

**Files:**
- Replace: `src/pages/SearchPage.vue`

- [ ] **Step 1: `src/pages/SearchPage.vue` を以下の内容に置き換える**

```vue
<template>
  <v-layout>
    <AppHeader title="商品検索" :show-back="true" />
    <v-main>
      <v-container class="pb-6">
        <!-- キーワード検索 -->
        <v-text-field
          v-model="store.keyword"
          label="キーワード検索"
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
          class="mt-4"
          @update:model-value="store.resetPage()"
        />

        <!-- 詳細検索（アコーディオン） -->
        <v-expansion-panels class="mb-4">
          <v-expansion-panel>
            <v-expansion-panel-title>詳細検索</v-expansion-panel-title>
            <v-expansion-panel-text>
              <p class="text-subtitle-2 mb-1">カテゴリ</p>
              <v-radio-group
                v-model="store.selectedCategory"
                inline
                class="mb-3"
                @update:model-value="store.resetPage()"
              >
                <v-radio label="すべて" value="" />
                <v-radio
                  v-for="cat in categories"
                  :key="cat"
                  :label="cat"
                  :value="cat"
                />
              </v-radio-group>
              <v-switch
                v-model="store.inStockOnly"
                label="在庫ありのみ表示"
                color="primary"
                hide-details
                @update:model-value="store.resetPage()"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- 件数表示 -->
        <p class="text-body-2 mb-3 text-medium-emphasis">
          {{ store.filteredProducts.length }}件
        </p>

        <!-- 商品一覧 -->
        <template v-if="store.pagedProducts.length > 0">
          <ProductCard
            v-for="product in store.pagedProducts"
            :key="product.id"
            :product="product"
            @click="openDialog(product)"
            @detail="goDetail(product)"
          />
        </template>
        <v-alert v-else type="info" variant="tonal">
          条件に一致する商品が見つかりませんでした。
        </v-alert>

        <!-- ページネーション -->
        <v-pagination
          v-if="store.totalPages > 1"
          v-model="store.currentPage"
          :length="store.totalPages"
          class="mt-4"
        />
      </v-container>
    </v-main>
    <AppFooter />

    <!-- クイックビューダイアログ -->
    <ProductDialog
      v-model="dialogOpen"
      :product="store.selectedProduct"
      @detail="goDetail"
    />
  </v-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import type { Product } from '@/types/product'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/product/ProductCard.vue'
import ProductDialog from '@/components/product/ProductDialog.vue'

const store = useProductStore()
const router = useRouter()
const dialogOpen = ref(false)

const categories = ['食品', '電子機器', 'ファッション', '家具', 'スポーツ'] as const

function openDialog(product: Product) {
  store.selectProduct(product)
  dialogOpen.value = true
}

function goDetail(product: Product) {
  dialogOpen.value = false
  store.selectProduct(product)
  router.push(`/detail/${product.id}`)
}
</script>
```

- [ ] **Step 2: ブラウザで動作確認**

```powershell
npm run dev
```

以下を確認：
- `http://localhost:3000/#/search` で商品カードが5件表示される
- 「詳細検索」アコーディオンが開閉する
- カテゴリラジオボタンで絞り込みが動作する
- 在庫ありトグルで絞り込みが動作する
- キーワード入力で絞り込みが動作する
- ページネーションが表示され切り替わる
- カードクリックでダイアログが開く
- ダイアログの「詳細を見る」で `/detail/:id` に遷移する

`Ctrl+C` で停止。

- [ ] **Step 3: コミット**

```powershell
git add src/pages/SearchPage.vue
git commit -m "feat: implement SearchPage with filtering, pagination, and dialog"
```

---

### Task 12: DetailPage の実装

**Files:**
- Replace: `src/pages/DetailPage.vue`

- [ ] **Step 1: `src/pages/DetailPage.vue` を以下の内容に置き換える**

```vue
<template>
  <v-layout>
    <AppHeader :title="product?.name ?? '詳細'" :show-back="true" />
    <v-main>
      <v-container v-if="product" class="pb-6">
        <v-tabs v-model="tab" class="mb-4" color="primary">
          <v-tab value="info">商品情報</v-tab>
          <v-tab value="reviews">レビュー</v-tab>
          <v-tab value="related">関連商品</v-tab>
        </v-tabs>

        <v-window v-model="tab">
          <!-- 商品情報タブ -->
          <v-window-item value="info">
            <v-card>
              <v-card-title>{{ product.name }}</v-card-title>
              <v-card-subtitle>{{ product.category }}</v-card-subtitle>
              <v-card-text>
                <p class="text-h5 mb-2">¥{{ product.price.toLocaleString() }}</p>
                <v-chip
                  :color="product.inStock ? 'success' : 'error'"
                  variant="tonal"
                  class="mb-3"
                >
                  {{ product.inStock ? '在庫あり' : '在庫なし' }}
                </v-chip>
                <v-rating
                  :model-value="product.rating"
                  readonly
                  color="amber"
                  class="mb-3"
                />
                <p class="text-body-1">{{ product.description }}</p>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  color="primary"
                  variant="elevated"
                  size="large"
                  :disabled="!product.inStock"
                  prepend-icon="mdi-cart"
                >
                  カートに追加
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-window-item>

          <!-- レビュータブ -->
          <v-window-item value="reviews">
            <v-radio-group
              v-model="reviewFilter"
              label="評価で絞り込み"
              inline
              class="mb-3"
            >
              <v-radio label="すべて" :value="0" />
              <v-radio
                v-for="n in 5"
                :key="n"
                :label="`${n}★`"
                :value="n"
              />
            </v-radio-group>
            <v-expansion-panels v-if="filteredReviews.length > 0">
              <v-expansion-panel
                v-for="review in filteredReviews"
                :key="review.id"
              >
                <v-expansion-panel-title>
                  {{ review.author }}
                  <v-rating
                    :model-value="review.rating"
                    readonly
                    density="compact"
                    size="small"
                    color="amber"
                    class="ml-2"
                  />
                </v-expansion-panel-title>
                <v-expansion-panel-text>{{ review.comment }}</v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
            <v-alert v-else type="info" variant="tonal">
              該当するレビューがありません。
            </v-alert>
          </v-window-item>

          <!-- 関連商品タブ -->
          <v-window-item value="related">
            <template v-if="relatedProducts.length > 0">
              <ProductCard
                v-for="p in relatedProducts"
                :key="p.id"
                :product="p"
                @click="goDetail(p)"
                @detail="goDetail(p)"
              />
            </template>
            <v-alert v-else type="info" variant="tonal">
              関連商品はありません。
            </v-alert>
          </v-window-item>
        </v-window>
      </v-container>

      <v-container v-else>
        <v-alert type="error" variant="tonal">商品が見つかりませんでした。</v-alert>
      </v-container>
    </v-main>
    <AppFooter />
  </v-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/product'
import type { Product } from '@/types/product'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/product/ProductCard.vue'

const props = defineProps<{ id: string }>()
const store = useProductStore()
const router = useRouter()

const tab = ref('info')
const reviewFilter = ref(0)

const product = computed(() =>
  store.products.find(p => p.id === Number(props.id)) ?? null
)

const filteredReviews = computed(() => {
  if (!product.value) return []
  if (reviewFilter.value === 0) return product.value.reviews
  return product.value.reviews.filter(r => r.rating === reviewFilter.value)
})

const relatedProducts = computed(() => {
  if (!product.value) return []
  return store.products
    .filter(p => p.category === product.value!.category && p.id !== product.value!.id)
    .slice(0, 4)
})

function goDetail(p: Product) {
  store.selectProduct(p)
  router.push(`/detail/${p.id}`)
}
</script>
```

- [ ] **Step 2: ブラウザで全画面の動作確認**

```powershell
npm run dev
```

以下を確認：
- SearchPageのカードの「詳細を見る」でDetailPageに遷移する
- ヘッダーの「←」ボタンでSearchPageに戻る
- 「商品情報」「レビュー」「関連商品」タブが切り替わる
- レビュータブのラジオボタンでフィルタリングが動作する
- レビューのアコーディオンが開閉する
- 関連商品カードクリックで別のDetailPageに遷移する

`Ctrl+C` で停止。

- [ ] **Step 3: コミット**

```powershell
git add src/pages/DetailPage.vue
git commit -m "feat: implement DetailPage with tabs, reviews accordion, and related products"
```

---

### Task 13: Capacitor Android ビルド検証

**前提:** Android Studio がインストール済みであること。インストールされていない場合は https://developer.android.com/studio からインストールする。

**Files:**
- Generate: `android/`（Capacitorが生成）

- [ ] **Step 1: Viteビルドを実行**

```powershell
npm run build
```

Expected: `dist/` ディレクトリが生成され、エラーなし。

- [ ] **Step 2: Capacitorを初期化してAndroidプラットフォームを追加**

```powershell
npx cap init "VuetifyPoC" "com.example.myapp" --web-dir dist
npx cap add android
```

Expected: `android/` ディレクトリが生成される。

- [ ] **Step 3: webアセットをAndroidプロジェクトに同期**

```powershell
npx cap sync
```

Expected: `Sync finished.` と表示されエラーなし。

- [ ] **Step 4: Android Studio でビルド**

```powershell
npx cap open android
```

Android Studio が起動したら：
1. メニュー `Build > Make Project`（または `Ctrl+F9`）を実行
2. `BUILD SUCCESSFUL` が表示されることを確認

- [ ] **Step 5: エミュレーターで動作確認**

Android Studio で：
1. AVD Manager（仮想デバイス）でエミュレーターを起動（なければ作成）
2. `Run > Run 'app'`（または `Shift+F10`）を実行
3. エミュレーター上でアプリが起動することを確認

以下のチェックリストを全て確認：
- [ ] MenuPageが表示される
- [ ] 「商品を探す」タップでSearchPageに遷移する
- [ ] 検索・絞り込みが動作する
- [ ] 商品カードタップでダイアログが開く
- [ ] 「詳細を見る」でDetailPageに遷移する
- [ ] タブ切り替えが動作する
- [ ] ヘッダーの戻るボタンで前ページに戻る

- [ ] **Step 6: コミット**

```powershell
git add android/ capacitor.config.ts
git commit -m "chore: add android platform and verify capacitor build"
```
