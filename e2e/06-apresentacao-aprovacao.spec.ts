import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Apresentação e Aprovação', () => {
  async function irParaApresentacao(page: any, empresa: string) {
    await page.goto('/empresas')
    await page.getByText(empresa).click()
    await page.getByRole('link', { name: /histórico/i }).click()
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

  test('botão de download DOCX visível', async ({ page }) => {
    await irParaApresentacao(page, 'Hospital São Lucas S/A')
    await expect(page.getByRole('link', { name: /docx|word/i })).toBeVisible()
  })

  test('formulário de encaminhar aprovação visível', async ({ page }) => {
    await irParaApresentacao(page, 'Varejo Express Ltda')
    await expect(page.getByRole('heading', { name: /encaminhar.*aprovação/i })).toBeVisible()
  })

  test('histórico de aprovação exibe status na HealthTech', async ({ page }) => {
    await irParaApresentacao(page, 'HealthTech Soluções')
    await expect(page.getByText(/aprovado/i).first()).toBeVisible()
  })
})
