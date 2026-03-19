import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Auth pages smoke tests', () => {
  test('login page renders key elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/AI Capability Radar/i)
    await expect(page.getByRole('textbox', { name: /e-mail/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /anmelden|login/i })).toBeVisible()
  })

  test('register page renders key elements', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('textbox', { name: /e-mail/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /passwort/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /konto erstellen/i })).toBeVisible()
  })

  test('forgot-password page renders', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('textbox', { name: /e-mail/i })).toBeVisible()
  })

  test('unauthenticated / redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Accessibility — auth pages', () => {
  test('login page — no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('register page — no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/register')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('forgot-password page — no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/forgot-password')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
