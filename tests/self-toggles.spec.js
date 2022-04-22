import { test as base, expect } from '@playwright/test'

base.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const test = base.extend({
  items: async ({ page }, use) => {
    const items = await page.locator('data-testid=todo-list >> li')
    await use(items)
  },
  firstItem: async ({ page }, use) => {
    const firstItem = await page.locator('data-testid=todo-list >> li').first()
    await use(firstItem)
  },
})

test('toggle on click', async ({ firstItem }) => {
  await firstItem.click()
  await expect(firstItem).toHaveAttribute('data-toggle', 'todo 1')
  await expect(firstItem).toHaveAttribute('aria-pressed', 'true')

  await firstItem.click()
  await expect(firstItem).toHaveAttribute('data-toggle', 'todo 0')
  await expect(firstItem).toHaveAttribute('aria-pressed', 'false')
})

test('toggle on Space', async ({ firstItem }) => {
  await firstItem.press(' ')
  await expect(firstItem).toHaveAttribute('data-toggle', 'todo 1')
  await expect(firstItem).toHaveAttribute('aria-pressed', 'true')

  await firstItem.press(' ')
  await expect(firstItem).toHaveAttribute('data-toggle', 'todo 0')
  await expect(firstItem).toHaveAttribute('aria-pressed', 'false')
})

test('toggle on Enter', async ({ firstItem }) => {
  await firstItem.press('Enter')
  await expect(firstItem).toHaveAttribute('data-toggle', 'todo 1')
  await expect(firstItem).toHaveAttribute('aria-pressed', 'true')

  await firstItem.press('Enter')
  await expect(firstItem).toHaveAttribute('data-toggle', 'todo 0')
  await expect(firstItem).toHaveAttribute('aria-pressed', 'false')
})

for (const key of ['F1', 'KeyA', 'Control', 'Digit1']) {
  test(`ignore ${key} key press`, async ({ firstItem }) => {
    await firstItem.press(key)
    await expect(firstItem).toHaveAttribute('data-toggle', 'todo 0')
    await expect(firstItem).toHaveAttribute('aria-pressed', 'false')
  })
}

test('only toggle itself', async ({ items }) => {
  await items.nth(0).click()
  await expect(items.nth(0)).toHaveAttribute('data-toggle', 'todo 1')
  await expect(items.nth(1)).toHaveAttribute('data-toggle', 'todo 0')
  await expect(items.nth(2)).toHaveAttribute('data-toggle', 'todo 0')
  await expect(items.nth(3)).toHaveAttribute('data-toggle', 'todo 0')

  await items.nth(2).click()
  await expect(items.nth(0)).toHaveAttribute('data-toggle', 'todo 1')
  await expect(items.nth(1)).toHaveAttribute('data-toggle', 'todo 0')
  await expect(items.nth(2)).toHaveAttribute('data-toggle', 'todo 1')
  await expect(items.nth(3)).toHaveAttribute('data-toggle', 'todo 0')
})
