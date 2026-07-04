import type { Page } from '@playwright/test'

/**
 * Navega até o diagnóstico (histórico) de um setor específico:
 * lista de empresas → página da empresa → aba Setores → card do setor → Ver Diagnóstico.
 * O card é localizado pelo nome do setor, para não depender da ordem de exibição.
 */
export async function abrirDiagnosticoDoSetor(page: Page, empresa: string, setor: string) {
  await page.goto('/empresas')
  await page.getByText(empresa).click()
  await page.getByRole('tab', { name: 'Setores' }).click()
  const card = page.locator('div.rounded-xl').filter({ hasText: setor })
  await card.getByRole('link', { name: /ver diagnóstico/i }).click()
  await page.waitForURL(/historico/)
}
