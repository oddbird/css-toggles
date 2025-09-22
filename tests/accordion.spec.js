import { test as base, expect } from '@playwright/test'

base.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const test = base.extend({
  terms: async ({ page }, use) => {
    const terms = await page.locator('data-testid=accordion >> dt')
    await use(terms)
  },
  dfns: async ({ page }, use) => {
    const dfns = await page.locator('data-testid=accordion >> dd')
    await use(dfns)
  },
})

test('aria-expanded', async ({ terms }) => {
  await expect(terms.nth(0)).toHaveAttribute('aria-expanded', 'false')
  await expect(terms.nth(1)).toHaveAttribute('aria-expanded', 'false')
  await expect(terms.nth(2)).toHaveAttribute('aria-expanded', 'false')
})

test('aria-controls', async ({ terms, dfns }) => {
  const id0 = await dfns.nth(0).getAttribute('id')
  const id1 = await dfns.nth(1).getAttribute('id')
  const id2 = await dfns.nth(2).getAttribute('id')

  expect(id0).toBe('existing-id')
  expect(id1).toBe('glossary-1')
  expect(id2).toBe('glossary-2')

  await expect(terms.nth(0)).toHaveAttribute('aria-controls', id0)
  await expect(terms.nth(1)).toHaveAttribute('aria-controls', id1)
  await expect(terms.nth(2)).toHaveAttribute('aria-controls', id2)
})

test('toggle visibility', async ({ terms, dfns }) => {
  await expect(dfns.nth(0)).not.toBeVisible()
  await expect(dfns.nth(1)).not.toBeVisible()
  await expect(dfns.nth(2)).not.toBeVisible()

  await terms.nth(0).click()
  await expect(terms.nth(0)).toHaveAttribute('aria-expanded', 'true')
  await expect(terms.nth(1)).toHaveAttribute('aria-expanded', 'false')
  await expect(terms.nth(2)).toHaveAttribute('aria-expanded', 'false')
  await expect(dfns.nth(0)).toBeVisible()
  await expect(dfns.nth(1)).not.toBeVisible()
  await expect(dfns.nth(2)).not.toBeVisible()

  await terms.nth(1).click()
  await expect(terms.nth(0)).toHaveAttribute('aria-expanded', 'true')
  await expect(terms.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await expect(terms.nth(2)).toHaveAttribute('aria-expanded', 'false')
  await expect(dfns.nth(0)).toBeVisible()
  await expect(dfns.nth(1)).toBeVisible()
  await expect(dfns.nth(2)).not.toBeVisible()
})
