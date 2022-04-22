import { test as base, expect } from '@playwright/test'

base.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const test = base.extend({
  buttons: async ({ page }, use) => {
    const buttons = await page.locator('data-testid=machine >> button')
    await use(buttons)
  },
  status: async ({ page }, use) => {
    const status = await page.locator('data-testid=machine-status')
    await use(status)
  },
})

test('prevent skipping', async ({ buttons, status }) => {
  await buttons.locator('text=resolve').click()
  await expect(status).toHaveAttribute('data-toggle', 'request idle')

  await buttons.locator('text=reject').click()
  await expect(status).toHaveAttribute('data-toggle', 'request idle')

  await buttons.locator('text=reset').click()
  await expect(status).toHaveAttribute('data-toggle', 'request idle')
})

test('reject', async ({ buttons, status }) => {
  await buttons.locator('text=try').click()
  await expect(status).toHaveAttribute('data-toggle', 'request loading')

  await buttons.locator('text=reject').click()
  await expect(status).toHaveAttribute('data-toggle', 'request failure')

  await buttons.locator('text=reset').click()
  await expect(status).toHaveAttribute('data-toggle', 'request idle')
})

test('succeed', async ({ buttons, status }) => {
  await buttons.locator('text=try').click()
  await expect(status).toHaveAttribute('data-toggle', 'request loading')

  await buttons.locator('text=resolve').click()
  await expect(status).toHaveAttribute('data-toggle', 'request success')

  await buttons.locator('text=reset').click()
  await expect(status).toHaveAttribute('data-toggle', 'request idle')
})
