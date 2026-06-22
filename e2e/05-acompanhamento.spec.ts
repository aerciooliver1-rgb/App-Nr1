import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Acompanhamento Kanban e Lista', () => {
  async function irParaAcompanhamento(page: any, empresa: string) {
    await page.goto('/empresas')
    await page.getByText(empresa).click()
    await page.getByRole('link', { name: /histórico/i }).click()
    await page.getByText(/ciclo/i).first().click()
    await page.getByRole('link', { name: /acompanhamento|próximo/i }).click()
    await page.waitForURL(/acompanhamento/)
  }

  test('Kanban exibe colunas de status', async ({ page }) => {
    await irParaAcompanhamento(page, 'Hospital São Lucas S/A')
    await expect(page.getByText(/pendente/i)).toBeVisible()
    await expect(page.getByText(/em andamento/i)).toBeVisible()
  })

  test('toggle para visão em lista funciona', async ({ page }) => {
    await irParaAcompanhamento(page, 'Varejo Express Ltda')
    await page.getByRole('button', { name: /lista/i }).click()
    // Visão lista exibe tabela
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /ação/i })).toBeVisible()
  })

  test('toggle volta para kanban', async ({ page }) => {
    await irParaAcompanhamento(page, 'Varejo Express Ltda')
    await page.getByRole('button', { name: /lista/i }).click()
    await page.getByRole('button', { name: /kanban/i }).click()
    // Kanban visível novamente
    await expect(page.getByRole('table')).not.toBeVisible()
  })

  test('ações atrasadas aparecem no Callcenter', async ({ page }) => {
    await irParaAcompanhamento(page, 'Callcenter Rápido S/A')
    await expect(page.getByText(/atrasada/i)).toBeVisible()
  })

  test('barra de progresso exibe percentual', async ({ page }) => {
    await irParaAcompanhamento(page, 'HealthTech Soluções')
    await expect(page.getByText(/%/)).toBeVisible()
  })
})
