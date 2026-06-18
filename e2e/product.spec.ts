import { test, expect, setupMockApi } from './fixtures'

// ============================================================
// シナリオ表: e2e/scenarios.md 参照
//   S7: FP-10/11   ページネーション
//   S8:            詳細 → メモ登録 → 一覧ステータス確認
// ============================================================

test('[S7] ページネーション → 2ページ目に移動すると別商品が表示される', async ({ page }) => {
  await setupMockApi(page)
  await page.goto('/#/products')
  await page.locator('.v-card-title').first().waitFor()

  // 1ページ目の先頭商品名を記録（pageSize=5 なので 1ページに最大5件）
  const firstProductName = await page.locator('.v-card-title').first().textContent()

  // Vuetify pagination のページ番号ボタン（aria-label="Go to page 2" の場合もあるので text で探す）
  await page.locator('.v-pagination button').filter({ hasText: /^2$/ }).click()

  // 2ページ目の先頭商品が1ページ目と異なる
  await expect(page.locator('.v-card-title').first()).toBeVisible()
  const secondProductName = await page.locator('.v-card-title').first().textContent()
  expect(secondProductName).not.toBe(firstProductName)
})

test('[S8] 詳細でメモ登録 → 一覧で「入力済み」に変わる', async ({ page }) => {
  await setupMockApi(page)
  await page.goto('/#/products')
  await page.locator('.v-card').first().waitFor()

  // 「未入力」チップのある商品の「詳細を見る」をクリック
  const card = page.locator('.v-card').filter({ has: page.getByText('未入力') }).first()
  await expect(card).toBeVisible()
  const productName = await card.locator('.v-card-title').textContent()

  await card.getByRole('button', { name: '詳細を見る' }).click()

  // 詳細画面でメモ入力（ルートは /detail/:id）
  await expect(page).toHaveURL(/\/#\/detail\/\d+/)
  await page.getByRole('textbox', { name: 'メモ' }).fill('テストメモ')

  // 登録ボタンをクリック
  await page.getByRole('button', { name: '登録' }).click()

  // スナックバーで「登録しました」を確認
  await expect(page.getByText('登録しました')).toBeVisible()

  // 一覧に戻る
  await page.goBack()
  await expect(page).toHaveURL(/\/#\/products$/)

  // 同じ商品のチップが「入力済み」に変わっている
  const sameCard = page.locator('.v-card').filter({ has: page.locator('.v-card-title', { hasText: productName! }) })
  await expect(sameCard.getByText('入力済み')).toBeVisible()
})
