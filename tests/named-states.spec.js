import { test as base, expect } from '@playwright/test'

base.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const test = base.extend({
  buttons: async ({ page }, use) => {
    const buttons = await page.locator('data-testid=colors >> button')
    await use(buttons)
  },
  target: async ({ page }, use) => {
    const target = await page.locator('data-testid=colors-target')
    await use(target)
  },
})

test('cycle', async ({ buttons, target }) => {
  await expect(target).toHaveAttribute('data-toggle', 'colors blue')

  await buttons.first().click()
  await expect(target).toHaveAttribute('data-toggle', 'colors red')

  await buttons.first().click()
  await expect(target).toHaveAttribute('data-toggle', 'colors grape')

  await buttons.first().click()
  await expect(target).toHaveAttribute('data-toggle', 'colors green')

  await buttons.first().click()
  await expect(target).toHaveAttribute('data-toggle', 'colors blue')
})

for (const color of ['grape', 'green', 'blue', 'red']) {
  test(`switch to ${color}`, async ({ buttons, target }) => {
    const button = await buttons.locator(`text=${color}`)

    await button.click()
    await expect(target).toHaveAttribute('data-toggle', `colors ${color}`)

    await button.click()
    await expect(target, 'Clicking again should produce no change').toHaveAttribute(
      'data-toggle',
      `colors ${color}`,
    )
  })
}
