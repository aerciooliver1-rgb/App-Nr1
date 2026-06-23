import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Dashboard e Navegação', () => {
  test('dashboard exibe métricas e navegação lateral', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/dashboard/i).first()).toBeVisible()
    // Sidebar links — scoped to <aside> to avoid matching dashboard cards
    const sidebar = page.locator('aside')
    await expect(sidebar.getByRole('link', { name: /empresas/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /relatório/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /catálogo/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /privacidade/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /configurações/i })).toBeVisible()
  })

  test('sidebar navega para todas as seções', async ({ page }) => {
    await page.goto('/dashboard')
    const sidebar = page.locator('aside')

    await sidebar.getByRole('link', { name: /empresas/i }).click()
    await expect(page).toHaveURL(/empresas/)

    await sidebar.getByRole('link', { name: /relatório/i }).click()
    await expect(page).toHaveURL(/relatorios/)

    await sidebar.getByRole('link', { name: /catálogo/i }).click()
    await expect(page).toHaveURL(/catalogo/)

    await sidebar.getByRole('link', { name: /configurações/i }).click()
    await expect(page).toHaveURL(/configuracoes/)
  })
})
