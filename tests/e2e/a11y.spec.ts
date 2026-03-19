import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility baseline', () => {
  test('login page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('register page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/register')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('login page has skip-to-content link', async ({ page }) => {
    await page.goto('/login')
    const skipLink = page.getByText('Zum Hauptinhalt springen')
    await expect(skipLink).toBeAttached()
    await skipLink.focus()
    await expect(skipLink).toBeVisible()
  })
})
