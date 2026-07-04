import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Apresentação e Aprovação', () => {
  async function irParaApresentacao(page: any, empresa: string) {
    await page.goto('/empresas')
    await page.getByText(empresa).click()
    await page.getByRole('tab', { name: 'Setores' }).click()
    await page.getByRole('link', { name: /ver diagnóstico/i }).first().click()
    await page.getByRole('link', { name: /acompanhamento/i }).click()
    await page.waitForURL(/acompanhamento/)
    await page.getByRole('link', { name: /apresenta/i }).click()
    await page.waitForURL(/apresentacao/)
  }

  test('apresentação exibe sumário executivo', async ({ page }) => {
    await irParaApresentacao(page, 'HealthTech Soluções')
    await expect(page.getByRole('heading', { name: /apresentação para gestores/i })).toBeVisible()
  })

  test('botão de download PPTX visível', async ({ page }) => {
    await irParaApresentacao(page, 'Hospital São Lucas S/A')
    await expect(page.getByRole('link', { name: /pptx|powerpoint/i })).toBeVisible()
  })

  test('botão de download PDF visível', async ({ page }) => {
    await irParaApresentacao(page, 'Hospital São Lucas S/A')
    await expect(page.getByRole('link', { name: /pdf/i })).toBeVisible()
  })

  test('formulário de encaminhar aprovação visível', async ({ page }) => {
    await irParaApresentacao(page, 'Varejo Express Ltda')
    await expect(page.getByRole('heading', { name: /encaminhar.*aprovação/i })).toBeVisible()
  })

  test('histórico de aprovação exibe status na Varejo Express', async ({ page }) => {
    await irParaApresentacao(page, 'Varejo Express Ltda')
    await expect(page.getByText(/aprovado/i).first()).toBeVisible()
  })
})
