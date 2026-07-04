import { test, expect } from '@playwright/test'
import { abrirDiagnosticoDoSetor } from './helpers'

test.use({ storageState: '.playwright/auth.json' })

const SETOR_PADRAO: Record<string, string> = {
  'Hospital São Lucas S/A': 'UTI e Pronto-Socorro',
  'Varejo Express Ltda': 'Equipe de Vendas',
  'Callcenter Rápido S/A': 'Atendimento ao Cliente',
  'HealthTech Soluções': 'Desenvolvimento de Software',
}

test.describe('Acompanhamento Kanban e Lista', () => {
  async function irParaAcompanhamento(page: any, empresa: string) {
    await abrirDiagnosticoDoSetor(page, empresa, SETOR_PADRAO[empresa])
    await page.getByRole('link', { name: /acompanhamento/i }).click()
    await page.waitForURL(/acompanhamento/)
  }

  test('Kanban exibe colunas de status', async ({ page }) => {
    await irParaAcompanhamento(page, 'Hospital São Lucas S/A')
    await expect(page.getByText(/pendente/i).first()).toBeVisible()
    await expect(page.getByText(/em andamento/i).first()).toBeVisible()
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
    await expect(page.getByText(/atrasada/i).first()).toBeVisible()
  })

  test('barra de progresso exibe percentual', async ({ page }) => {
    await irParaAcompanhamento(page, 'HealthTech Soluções')
    await expect(page.getByText(/%/).first()).toBeVisible()
  })
})
