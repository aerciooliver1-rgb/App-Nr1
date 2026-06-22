import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Resultado e Plano de Ação', () => {
  async function navegarParaAssessment(page: any, nomeEmpresa: string) {
    await page.goto('/empresas')
    await page.getByText(nomeEmpresa).click()
    await page.getByRole('link', { name: /histórico/i }).click()
    // Clica no ciclo 1
    await page.getByText(/ciclo.*1|1.*ciclo/i).first().click()
    await page.waitForURL(/resultado|avaliacao/)
  }

  test('resultado da HealthTech mostra nível baixo', async ({ page }) => {
    await navegarParaAssessment(page, 'HealthTech Soluções')
    await expect(page.getByText(/baixo/i)).toBeVisible()
    await expect(page.getByText(/Desenvolvimento de Software|HealthTech/i)).toBeVisible()
  })

  test('resultado do Callcenter mostra nível crítico', async ({ page }) => {
    await navegarParaAssessment(page, 'Callcenter Rápido S/A')
    await expect(page.getByText(/crítico/i)).toBeVisible()
  })

  test('navega do resultado para o plano de ação', async ({ page }) => {
    await navegarParaAssessment(page, 'Varejo Express Ltda')
    await page.getByRole('link', { name: /plano de ação|próximo/i }).click()
    await expect(page).toHaveURL(/plano/)
    await expect(page.getByText(/ação|plano/i)).toBeVisible()
  })

  test('plano do Hospital exibe ações com status variados', async ({ page }) => {
    await page.goto('/empresas')
    await page.getByText('Hospital São Lucas S/A').click()
    await page.getByRole('link', { name: /histórico/i }).click()
    await page.getByText(/ciclo/i).first().click()
    await page.getByRole('link', { name: /plano|próximo/i }).click()
    await expect(page.getByText(/atrasada|em andamento|pendente/i)).toBeVisible()
  })
})
