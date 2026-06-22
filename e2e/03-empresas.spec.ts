import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Empresas', () => {
  test('lista as 4 empresas criadas', async ({ page }) => {
    await page.goto('/empresas')
    await expect(page.getByText('HealthTech Soluções')).toBeVisible()
    await expect(page.getByText('Varejo Express Ltda')).toBeVisible()
    await expect(page.getByText('Hospital São Lucas S/A')).toBeVisible()
    await expect(page.getByText('Callcenter Rápido S/A')).toBeVisible()
  })

  test('navega para detalhes de uma empresa', async ({ page }) => {
    await page.goto('/empresas')
    await page.getByText('HealthTech Soluções').click()
    await expect(page).toHaveURL(/empresas\/[0-9a-f-]+/)
    await expect(page.getByText('Desenvolvimento de Software')).toBeVisible()
  })

  test('navega para histórico do setor', async ({ page }) => {
    await page.goto('/empresas')
    await page.getByText('HealthTech Soluções').click()
    await page.getByRole('link', { name: /histórico|ver histórico/i }).click()
    await expect(page).toHaveURL(/historico/)
    await expect(page.getByText(/ciclo/i)).toBeVisible()
  })

  test('empresa crítica exibe indicador de nível', async ({ page }) => {
    await page.goto('/empresas')
    await expect(page.getByText('Callcenter Rápido S/A')).toBeVisible()
    // Verifica que algum indicador de nível crítico está visível
    await expect(page.getByText(/crítico/i)).toBeVisible()
  })
})
