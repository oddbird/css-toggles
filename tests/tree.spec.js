import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('nested visibility', async ({ page }) => {
  const resources = await page.locator('data-testid=resources-branch')
  const resourcesBtn = await page.locator('data-testid=resources-button')
  const media = await page.locator('data-testid=media-branch')
  const mediaBtn = await page.locator('data-testid=media-button')

  await expect(resourcesBtn).toHaveAttribute('data-toggle', 'tree 0')
  await expect(resources).not.toBeVisible()
  await expect(mediaBtn).toHaveAttribute('data-toggle', 'tree 0')
  await expect(media).not.toBeVisible()

  await resourcesBtn.click()
  await expect(resourcesBtn).toHaveAttribute('data-toggle', 'tree 1')
  await expect(resources).toBeVisible()
  await expect(mediaBtn).toHaveAttribute('data-toggle', 'tree 0')
  await expect(media).not.toBeVisible()

  await mediaBtn.click()
  await expect(resourcesBtn).toHaveAttribute('data-toggle', 'tree 1')
  await expect(resources).toBeVisible()
  await expect(mediaBtn).toHaveAttribute('data-toggle', 'tree 1')
  await expect(media).toBeVisible()

  await resourcesBtn.click()
  await expect(resourcesBtn).toHaveAttribute('data-toggle', 'tree 0')
  await expect(resources).not.toBeVisible()
  await expect(mediaBtn).toHaveAttribute('data-toggle', 'tree 1')
  await expect(media).not.toBeVisible()
})
