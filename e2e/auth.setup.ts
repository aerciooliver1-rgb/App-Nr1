import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../.playwright/auth.json')

setup('autenticar como admin', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /entrar|login/i })).toBeVisible()

  await page.getByLabel(/e-mail/i).fill('aerciooliver1@gmail.com')
  await page.getByLabel(/senha/i).fill('Admin@2026')
  await page.getByRole('button', { name: /entrar/i }).click()

  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await page.context().storageState({ path: authFile })
})
