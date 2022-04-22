import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('toggle visibility', async ({ page }) => {
  const terms = await page.locator('data-testid=accordion >> dt')
  const dfns = await page.locator('data-testid=accordion >> dd')

  await expect(dfns.nth(0)).not.toBeVisible()
  await expect(dfns.nth(1)).not.toBeVisible()
  await expect(dfns.nth(2)).not.toBeVisible()

  await terms.nth(0).click()
  await expect(dfns.nth(0)).toBeVisible()
  await expect(dfns.nth(1)).not.toBeVisible()
  await expect(dfns.nth(2)).not.toBeVisible()

  await terms.nth(1).click()
  await expect(dfns.nth(0)).toBeVisible()
  await expect(dfns.nth(1)).toBeVisible()
  await expect(dfns.nth(2)).not.toBeVisible()
})
