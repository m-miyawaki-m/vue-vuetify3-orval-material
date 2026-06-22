# Playwright リファレンス

## セットアップ

```bash
npm install -D @playwright/test
npx playwright install chromium   # ブラウザをインストール
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:5173',   // Vite dev server
  use: {
    headless: true,                   // CI は true、手動確認は false
    viewport: { width: 390, height: 844 },  // iPhone 14 サイズ（スマホ前提）
    screenshot: 'only-on-failure',    // 失敗時だけスクショ保存
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 基本構造

```ts
import { test, expect } from '@playwright/test'

test('テスト名', async ({ page }) => {
  await page.goto('/#/search')
  // 操作・検証
})

test.describe('グループ名', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/')
  })

  test('ケース1', async ({ page }) => { ... })
  test('ケース2', async ({ page }) => { ... })
})
```

---

## ページ操作

### ナビゲーション

```ts
await page.goto('/#/search')           // URL に遷移（Hash History 対応）
await page.goBack()                    // ブラウザ戻る
await page.reload()                    // リロード
await page.waitForURL('/#/products')  // URL 変化を待つ
```

### 要素の取得（Locator）

```ts
// テキストで取得（最も読みやすい）
page.getByText('検索')
page.getByRole('button', { name: '検索' })
page.getByRole('textbox', { name: 'キーワード検索' })
page.getByLabel('キーワード検索')
page.getByPlaceholder('キーワードを入力')

// CSS セレクタ
page.locator('.v-card')
page.locator('[data-testid="product-card"]')
page.locator('input[type="text"]')

// n 番目の要素
page.locator('.v-card').first()
page.locator('.v-card').nth(2)         // 0 始まり
page.locator('.v-card').last()
```

### クリック・入力

```ts
await page.getByRole('button', { name: '検索' }).click()
await page.getByRole('button', { name: '絞り込み' }).click()
await page.locator('.v-card').first().click()

await page.getByLabel('キーワード検索').fill('緑茶')    // 値をセット
await page.getByLabel('キーワード検索').clear()        // クリア
await page.getByLabel('キーワード検索').type('緑茶')   // 1文字ずつ入力（遅い）

await page.getByLabel('数量').fill('3')
await page.keyboard.press('Enter')
await page.keyboard.press('Tab')
```

---

## アサーション（expect）

### URL・ページ

```ts
await expect(page).toHaveURL('/#/products')
await expect(page).toHaveURL(/#\/products\?q=/)  // 正規表現
await expect(page).toHaveTitle('商品検索')
```

### 要素の表示・非表示

```ts
await expect(page.getByText('絞り込み条件')).toBeVisible()
await expect(page.getByText('絞り込み条件')).toBeHidden()
await expect(page.locator('.v-dialog')).toBeVisible()

await expect(page.getByRole('button', { name: '登録' })).toBeEnabled()
await expect(page.getByRole('button', { name: '登録' })).toBeDisabled()
```

### テキスト内容

```ts
await expect(page.locator('.v-card').first()).toContainText('緑茶')
await expect(page.locator('h1')).toHaveText('商品検索')    // 完全一致
await expect(page.locator('.count')).toHaveText(/[0-9]+件/) // 正規表現
```

### 入力値

```ts
await expect(page.getByLabel('キーワード')).toHaveValue('緑茶')
await expect(page.getByRole('checkbox')).toBeChecked()
```

### 件数

```ts
await expect(page.locator('.v-card')).toHaveCount(5)
expect(await page.locator('.v-card').count()).toBeGreaterThan(0)
```

---

## 待機

Playwright は自動で最大 30 秒待機する（actionTimeout）。明示的な `sleep` は基本不要。

```ts
// 要素が出るまで待つ（自動で待つので通常は不要）
await page.waitForSelector('.v-card')
await page.locator('.v-card').waitFor({ state: 'visible' })

// URL 変化を待つ
await page.waitForURL('/#/products')

// ネットワーク完了を待つ
await page.waitForLoadState('networkidle')

// 特定のリクエストを待つ
await page.waitForResponse(resp => resp.url().includes('/menu') && resp.status() === 200)

// 絶対に必要な場合のみ sleep（アンチパターン）
await page.waitForTimeout(500)
```

---

## よく使うパターン集

### パターン 1：検索 → 一覧 → 詳細の一連フロー

```ts
test('検索から詳細まで遷移できる', async ({ page }) => {
  await page.goto('/#/search')

  // キーワード入力
  await page.getByPlaceholder('キーワード検索').fill('緑茶')

  // 検索ボタン押下
  await page.getByRole('button', { name: '検索' }).click()

  // 一覧ページへ遷移したことを確認
  await expect(page).toHaveURL(/#\/products/)
  await expect(page.getByText('件')).toBeVisible()

  // 商品カードが表示されている
  await expect(page.locator('.v-card').first()).toBeVisible()

  // 最初のカードをクリック
  await page.locator('.v-card').first().click()

  // 詳細ページへ遷移
  await expect(page).toHaveURL(/#\/detail\/\d+/)
  await expect(page.getByText('基本情報')).toBeVisible()
})
```

### パターン 2：フッターナビゲーション

```ts
test('フッターナビで各タブに遷移できる', async ({ page }) => {
  await page.goto('/#/')

  // メニュータブ
  await page.getByRole('button', { name: 'メニュー' }).click()
  await expect(page).toHaveURL('/#/menu')
  await expect(page.getByText('メインメニュー')).toBeVisible()

  // 検索タブ
  await page.getByRole('button', { name: '検索' }).click()
  await expect(page).toHaveURL('/#/search')

  // クイックに戻る
  await page.getByRole('button', { name: 'クイック' }).click()
  await expect(page).toHaveURL('/#/')
})
```

### パターン 3：絞り込みダイアログ

```ts
test('絞り込み条件を設定して検索できる', async ({ page }) => {
  await page.goto('/#/search')

  // 絞り込みダイアログを開く
  await page.getByRole('button', { name: '絞り込み' }).click()
  await expect(page.getByText('絞り込み条件')).toBeVisible()

  // カテゴリを選択
  await page.getByText('食品').click()

  // 在庫ありにチェック
  await page.getByRole('switch', { name: '在庫ありのみ' }).click()

  // 閉じる
  await page.getByRole('button', { name: '閉じる' }).click()

  // チップが表示されていることを確認
  await expect(page.getByText('食品')).toBeVisible()
  await expect(page.getByText('在庫あり')).toBeVisible()

  // 検索実行
  await page.getByRole('button', { name: '検索' }).click()
  await expect(page).toHaveURL(/#\/products\?category=%E9%A3%9F%E5%93%81/)
})
```

### パターン 4：メインメニュー → サブメニュー → 画面遷移

```ts
test('メインメニューから商品管理に遷移できる', async ({ page }) => {
  await page.goto('/#/menu')

  // メニューグリッドが表示されるのを待つ
  await expect(page.getByText('商品管理')).toBeVisible()

  // 商品管理をクリック
  await page.getByText('商品管理').click()

  // サブメニューシートが開く
  await expect(page.getByText('商品一覧')).toBeVisible()

  // 商品一覧をクリック
  await page.getByText('商品一覧').click()

  // /products に遷移
  await expect(page).toHaveURL('/#/products')
})
```

### パターン 5：ページネーション

```ts
test('ページネーションで次のページに移動できる', async ({ page }) => {
  await page.goto('/#/products')

  // 最初のページの商品を記録
  const firstCard = await page.locator('.v-card').first().textContent()

  // 2ページ目に移動
  await page.getByRole('button', { name: '2' }).click()

  // 商品が変わっていることを確認
  const secondPageCard = await page.locator('.v-card').first().textContent()
  expect(firstCard).not.toBe(secondPageCard)
})
```

### パターン 6：詳細 → 登録バリデーション

```ts
test('必須未入力で登録するとエラーが表示される', async ({ page }) => {
  await page.goto('/#/detail/1')

  // ロケーション・グループを未選択のまま登録ボタン押下
  await page.getByRole('button', { name: '登録' }).click()

  // 確認ダイアログ
  await expect(page.getByText('登録確認')).toBeVisible()
  await page.getByRole('button', { name: 'OK' }).click()

  // エラーメッセージ表示
  await expect(page.getByText('ロケーションを選択してください')).toBeVisible()

  // エラー履歴ボトムシートが開く
  await expect(page.getByText('エラー履歴')).toBeVisible()
})
```

### パターン 7：スクリーンショット（レイアウト確認）

```ts
test('検索ページのレイアウトが崩れていない', async ({ page }) => {
  await page.goto('/#/search')
  await expect(page.locator('.v-app-bar')).toBeVisible()

  // スクリーンショットと比較（初回実行でベースライン作成）
  await expect(page).toHaveScreenshot('search-page.png', {
    maxDiffPixels: 100,   // 許容ピクセル数
  })
})
```

### パターン 8：モバイルサイズでのテスト

```ts
import { devices } from '@playwright/test'

test.use({ ...devices['iPhone 14'] })

test('スマホサイズで詳細ページが表示できる', async ({ page }) => {
  await page.goto('/#/detail/1')
  await expect(page.getByText('基本情報')).toBeVisible()
  // フッターが見えているか
  await expect(page.getByRole('button', { name: '登録' })).toBeVisible()
})
```

### パターン 9：API をモック（MSW / ルートインターセプト）

```ts
test('API エラー時にオフライン表示になる', async ({ page }) => {
  // /menu へのリクエストを500エラーにする
  await page.route('**/menu', route => route.fulfill({ status: 500 }))

  await page.goto('/#/menu')

  // メニューが表示される（フォールバックデータを使用）
  await expect(page.locator('.menu-item').first()).toBeVisible()
})

test('商品一覧で API エラーならオフラインモード表示', async ({ page }) => {
  await page.route('**/products**', route => route.abort())

  await page.goto('/#/products')
  await expect(page.getByText('オフラインモード')).toBeVisible()
})
```

---

## デバッグ

```bash
# GUI モード（ブラウザを見ながらデバッグ）
npx playwright test --ui

# ヘッドフル（ブラウザを開いてゆっくり実行）
npx playwright test --headed --slow-mo=500

# 特定テストのみ
npx playwright test e2e/search.spec.ts

# テスト名で絞り込み
npx playwright test --grep '検索から詳細'

# 失敗時にデバッガを起動
npx playwright test --debug

# レポート表示
npx playwright show-report
```

### ページ内で止めてデバッグ

```ts
test('デバッグ', async ({ page }) => {
  await page.goto('/#/search')
  await page.pause()   // ← ここで一時停止してブラウザを操作できる
})
```

---

## Vitest との使い分けまとめ

| 観点 | Vitest | Playwright |
|------|--------|-----------|
| 実行速度 | 速い（jsdom） | 遅い（実ブラウザ） |
| 対象 | 関数・コンポーネント・store | 画面フロー・レイアウト |
| モック | vi.mock で自由に差し替え | page.route でネットワーク差し替え |
| ルーター | vi.mock で push をスパイ | 実際に URL が変わる |
| ダイアログ | document.body で確認 | getByRole / getByText で確認 |
| 向いているケース | ロジック・UI 部品の仕様検証 | ユーザー体験・ページ間連携の確認 |
| スクリーンショット | ❌ | ✅ レイアウト回帰テスト |

---

## コマンドまとめ

```bash
# インストール
npm install -D @playwright/test
npx playwright install chromium

# 実行
npx playwright test                     # 全テスト
npx playwright test e2e/search.spec.ts  # ファイル指定
npx playwright test --grep '検索'       # テスト名絞り込み
npx playwright test --headed            # ブラウザを表示
npx playwright test --ui                # GUI モード
npx playwright test --debug             # デバッガ起動

# レポート・スクリーンショット
npx playwright show-report
npx playwright test --update-snapshots  # スクリーンショットのベースライン更新
```
