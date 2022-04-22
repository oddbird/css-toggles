import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('cycle trough modes', async ({ page }) => {
  const button = await page.locator('data-testid=mode-btn')
  const html = await page.locator('html')

  await expect(html).toHaveAttribute('data-toggle', 'mode auto')

  await button.click()
  await expect(html).toHaveAttribute('data-toggle', 'mode light')

  await button.click()
  await expect(html).toHaveAttribute('data-toggle', 'mode dark')

  await button.click()
  await expect(html).toHaveAttribute('data-toggle', 'mode auto')
})
