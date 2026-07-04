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
    await page.getByRole('tab', { name: 'Setores' }).click()
    await expect(page.getByText('Desenvolvimento de Software').first()).toBeVisible()
  })

  test('detalhes exibem abas de status, setores e avaliações', async ({ page }) => {
    await page.goto('/empresas')
    await page.getByText('Hospital São Lucas S/A').click()
    await expect(page.getByRole('tab', { name: 'Status Atual' })).toBeVisible()
    await expect(page.getByText(/score por setor/i)).toBeVisible()
    await page.getByRole('tab', { name: 'Setores' }).click()
    await expect(page.getByText(/gerente\(s\) responsável/i).first()).toBeVisible()
    await page.getByRole('tab', { name: 'Avaliações' }).click()
    await expect(page.getByRole('columnheader', { name: /score geral/i })).toBeVisible()
  })

  test('navega para diagnóstico do setor', async ({ page }) => {
    await page.goto('/empresas')
    await page.getByText('HealthTech Soluções').click()
    await page.getByRole('tab', { name: 'Setores' }).click()
    await page.getByRole('link', { name: /ver diagnóstico/i }).first().click()
    await expect(page).toHaveURL(/historico/)
    await expect(page.getByText(/ciclo/i).first()).toBeVisible()
  })

  test('empresa crítica exibe indicador de nível', async ({ page }) => {
    await page.goto('/empresas')
    await expect(page.getByText('Callcenter Rápido S/A')).toBeVisible()
    // Verifica que algum indicador de nível crítico está visível
    await expect(page.getByText(/crítico/i).first()).toBeVisible()
  })
})
