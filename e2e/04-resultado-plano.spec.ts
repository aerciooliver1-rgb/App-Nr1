import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Resultado e Plano de Ação', () => {
  async function navegarParaResultado(page: any, nomeEmpresa: string) {
    await page.goto('/empresas')
    await page.getByText(nomeEmpresa).click()
    await page.getByRole('link', { name: /histórico/i }).first().click()
    await page.getByRole('link', { name: /ciclo/i }).first().click()
    await page.waitForURL(/resultado/)
  }

  test('resultado da HealthTech mostra nível baixo', async ({ page }) => {
    await navegarParaResultado(page, 'HealthTech Soluções')
    await expect(page.getByText(/baixo/i).first()).toBeVisible()
    await expect(page.getByText(/Desenvolvimento de Software|HealthTech/i).first()).toBeVisible()
  })

  test('resultado do Callcenter mostra nível crítico', async ({ page }) => {
    await navegarParaResultado(page, 'Callcenter Rápido S/A')
    await expect(page.getByText(/crítico/i).first()).toBeVisible()
  })

  async function navegarParaPlano(page: any, nomeEmpresa: string) {
    await page.goto('/empresas')
    await page.getByText(nomeEmpresa).click()
    await page.getByRole('link', { name: /histórico/i }).first().click()
    await page.getByRole('link', { name: /acompanhamento/i }).click()
    await page.waitForURL(/acompanhamento/)
    await page.getByRole('link', { name: /apresenta/i }).click()
    await page.waitForURL(/apresentacao/)
    await page.getByRole('link', { name: /plano de ação/i }).click()
    await page.waitForURL(/plano/)
  }

  test('navega do resultado para o plano de ação', async ({ page }) => {
    await navegarParaPlano(page, 'Varejo Express Ltda')
    await expect(page.getByRole('heading', { name: /plano de ação/i })).toBeVisible()
  })

  test('plano do Hospital exibe ações com status variados', async ({ page }) => {
    await navegarParaPlano(page, 'Hospital São Lucas S/A')
    await expect(page.getByText(/atrasada|em andamento|pendente/i).first()).toBeVisible()
  })
})
