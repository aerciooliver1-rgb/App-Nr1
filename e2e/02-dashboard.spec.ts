import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Dashboard e Navegação', () => {
  test('dashboard exibe métricas e navegação lateral', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/dashboard/i).first()).toBeVisible()
    // Sidebar links
    await expect(page.getByRole('link', { name: /empresas/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /relatório/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /catálogo/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /privacidade/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Configurações/i })).toBeVisible()
  })

  test('sidebar navega para todas as seções', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByRole('link', { name: /empresas/i }).click()
    await expect(page).toHaveURL(/empresas/)

    await page.getByRole('link', { name: /relatório/i }).click()
    await expect(page).toHaveURL(/relatorios/)

    await page.getByRole('link', { name: /catálogo/i }).click()
    await expect(page).toHaveURL(/catalogo/)

    await page.getByRole('link', { name: /Configurações/i }).click()
    await expect(page).toHaveURL(/configuracoes/)
  })
})
