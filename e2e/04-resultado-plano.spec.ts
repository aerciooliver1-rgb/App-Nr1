import { test, expect } from '@playwright/test'
import { abrirDiagnosticoDoSetor } from './helpers'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Resultado e Plano de Ação', () => {
  async function navegarParaResultado(page: any, empresa: string, setor: string) {
    await abrirDiagnosticoDoSetor(page, empresa, setor)
    await page.getByRole('link', { name: /ciclo/i }).first().click()
    await page.waitForURL(/resultado/)
  }

  test('resultado da HealthTech mostra nível baixo', async ({ page }) => {
    await navegarParaResultado(page, 'HealthTech Soluções', 'Desenvolvimento de Software')
    await expect(page.getByText(/baixo/i).first()).toBeVisible()
    await expect(page.getByText(/Desenvolvimento de Software|HealthTech/i).first()).toBeVisible()
  })

  test('resultado do Callcenter mostra nível crítico', async ({ page }) => {
    await navegarParaResultado(page, 'Callcenter Rápido S/A', 'Atendimento ao Cliente')
    await expect(page.getByText(/crítico/i).first()).toBeVisible()
  })

  async function navegarParaPlano(page: any, empresa: string, setor: string) {
    await abrirDiagnosticoDoSetor(page, empresa, setor)
    await page.getByRole('link', { name: /acompanhamento/i }).click()
    await page.waitForURL(/acompanhamento/)
    await page.getByRole('link', { name: /apresenta/i }).click()
    await page.waitForURL(/apresentacao/)
    await page.getByRole('link', { name: /plano de ação/i }).click()
    await page.waitForURL(/plano/)
  }

  test('navega do resultado para o plano de ação', async ({ page }) => {
    await navegarParaPlano(page, 'Varejo Express Ltda', 'Equipe de Vendas')
    await expect(page.getByRole('heading', { name: /plano de ação/i })).toBeVisible()
  })

  test('plano do Hospital exibe ações com status variados', async ({ page }) => {
    await navegarParaPlano(page, 'Hospital São Lucas S/A', 'UTI e Pronto-Socorro')
    await expect(page.getByText(/atrasada|em andamento|pendente/i).first()).toBeVisible()
  })
})
