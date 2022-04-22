import { test as base, expect } from '@playwright/test'

base.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const test = base.extend({
  tabs: async ({ page }, use) => {
    const tabs = await page.locator('data-testid=tabs >> panel-tab')
    await use(tabs)
  },
  cards: async ({ page }, use) => {
    const cards = await page.locator('data-testid=tabs >> panel-card')
    await use(cards)
  },
})

// https://github.com/oddbird/css-toggles/issues/9
test.fixme('first card open by default', async ({ cards }) => {
  await expect(cards.first()).toBeVisible()
})

test('stay open on repeated trigger', async ({ tabs, cards }) => {
  await tabs.first().click()
  await expect(cards.first()).toBeVisible()

  await tabs.first().click()
  await expect(cards.first()).toBeVisible()

  await tabs.first().click()
  await expect(cards.first()).toBeVisible()
})

test('auto-close others', async ({ tabs, cards }) => {
  await tabs.first().click()
  await expect(cards.first()).toBeVisible()
  await expect(cards.last()).not.toBeVisible()

  await tabs.last().click()
  await expect(cards.first()).not.toBeVisible()
  await expect(cards.last()).toBeVisible()

  await tabs.first().click()
  await expect(cards.first()).toBeVisible()
  await expect(cards.last()).not.toBeVisible()
})
