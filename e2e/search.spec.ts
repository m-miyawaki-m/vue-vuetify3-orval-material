import { test, expect, setupMockApi } from './fixtures'

// ============================================================
// シナリオ表: e2e/scenarios.md 参照
// デシジョンテーブル → シナリオ → テストの対応
//   S1: BQ-1, FP-1  条件なし
//   S2: BQ-2, FP-2  keyword のみ
//   S3: BQ-3, FP-3  category のみ
//   S4: BQ-4, FP-4  inStock のみ
//   S5: BQ-8, FP-8  全条件
//   S6: FP-9        一致なし
// ============================================================

test.beforeEach(async ({ page }) => {
  await setupMockApi(page)
  await page.goto('/#/search')
  await page.getByText('商品検索').waitFor()
})

/** ダイアログを開いて操作する共通ヘルパー */
async function openFilterDialog(page: Parameters<typeof test>[1]['page']) {
  await page.getByRole('button', { name: '絞り込み' }).click()
  await page.getByRole('dialog').waitFor()
}

test('[S1] 条件なしで検索 → 全件表示', async ({ page }) => {
  await page.getByRole('button', { name: '検索', exact: true }).click()

  await expect(page).toHaveURL(/\/products/)
  await expect(page.getByText('条件なし（全件）')).toBeVisible()
  await expect(page.locator('.v-card').first()).toBeVisible()
})

test('[S2] キーワードのみで検索 → 一致商品を表示', async ({ page }) => {
  await page.getByRole('textbox', { name: 'キーワード検索' }).fill('緑茶')
  // exact: true で clearable アイコン（aria-label="クリア キーワード検索"）との重複を回避
  await page.getByRole('button', { name: '検索', exact: true }).click()

  await expect(page).toHaveURL(/q=/)
  await expect(page.locator('.v-chip').filter({ hasText: '緑茶' })).toBeVisible()
  await expect(page.locator('.v-card-title').filter({ hasText: '緑茶' })).toBeVisible()
})

test('[S3] カテゴリのみで検索 → カテゴリ一致商品を表示', async ({ page }) => {
  await openFilterDialog(page)
  await page.getByRole('radio', { name: '食品' }).click()
  // getByRole('dialog') でスコープしチップの×ボタンと区別
  await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()

  await page.getByRole('button', { name: '検索', exact: true }).click()

  await expect(page).toHaveURL(/category=/)
  await expect(page.locator('.v-chip').filter({ hasText: '食品' })).toBeVisible()
})

test('[S4] 在庫ありのみで検索 → 在庫あり商品のみ表示', async ({ page }) => {
  await openFilterDialog(page)
  // v-switch は role="switch" だがラベル紐付けが aria-labelledby のため name 検索不可 → role で直接指定
  await page.locator('[aria-label="在庫ありのみ表示"]').click()
  await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()

  await page.getByRole('button', { name: '検索', exact: true }).click()

  await expect(page).toHaveURL(/inStock=true/)
  await expect(page.locator('.v-chip').filter({ hasText: '在庫あり' }).first()).toBeVisible()
  await expect(
    page.locator('.list-body .v-chip').filter({ hasText: '在庫なし' })
  ).toHaveCount(0)
})

test('[S5] 全条件で検索 → 複合絞り込み結果を表示', async ({ page }) => {
  await page.getByRole('textbox', { name: 'キーワード検索' }).fill('茶')

  await openFilterDialog(page)
  await page.getByRole('radio', { name: '食品' }).click()
  await page.locator('[aria-label="在庫ありのみ表示"]').click()
  await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()

  await page.getByRole('button', { name: '検索', exact: true }).click()

  await expect(page).toHaveURL(/q=/)
  await expect(page).toHaveURL(/category=/)
  await expect(page).toHaveURL(/inStock=true/)
  // list-header 内の SearchConditionChips に keyword / category / inStock チップが3つ表示
  await expect(page.locator('.list-header .v-chip').filter({ hasText: '茶' })).toBeVisible()
  await expect(page.locator('.list-header .v-chip').filter({ hasText: '食品' })).toBeVisible()
  await expect(page.locator('.list-header .v-chip').filter({ hasText: '在庫あり' })).toBeVisible()
})

test('[S6] 一致しないキーワードで検索 → 0件メッセージ表示', async ({ page }) => {
  await page.getByRole('textbox', { name: 'キーワード検索' }).fill('存在しない商品XYZ')
  await page.getByRole('button', { name: '検索', exact: true }).click()

  await expect(page).toHaveURL(/\/products/)
  // API mock が 0件レスポンスを返すので isLoading が解消されるまで待つ
  await expect(page.getByText('条件に一致する商品が見つかりませんでした。')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('.v-card-title')).toHaveCount(0)
})
