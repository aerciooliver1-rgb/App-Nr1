import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Relatórios', () => {
  test('dashboard de relatórios carrega com gráfico', async ({ page }) => {
    await page.goto('/relatorios')
    await expect(page.getByRole('heading', { name: /relatórios/i })).toBeVisible()
    // Recharts renderiza SVG
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 10000 })
  })

  test('tabela de relatórios exibe as 4 empresas', async ({ page }) => {
    await page.goto('/relatorios')
    await expect(page.locator('table').getByText('HealthTech Soluções')).toBeVisible()
    await expect(page.locator('table').getByText('Varejo Express Ltda')).toBeVisible()
    await expect(page.locator('table').getByText('Hospital São Lucas S/A')).toBeVisible()
    await expect(page.locator('table').getByText('Callcenter Rápido S/A')).toBeVisible()
  })

  test('links de exportação presentes na tabela', async ({ page }) => {
    await page.goto('/relatorios')
    await expect(page.getByRole('link', { name: /pptx/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /docx/i }).first()).toBeVisible()
  })
})

test.describe('Configurações', () => {
  test('aba Perfil exibe formulário de nome e senha', async ({ page }) => {
    await page.goto('/configuracoes')
    await expect(page.getByRole('button', { name: 'Perfil' })).toBeVisible()
    await expect(page.getByText(/nome de exibição/i)).toBeVisible()
  })

  test('aba Empresa exibe formulário de dados da empresa', async ({ page }) => {
    await page.goto('/configuracoes')
    await page.getByRole('button', { name: /empresa/i }).click()
    await expect(page.getByText(/nome da empresa/i)).toBeVisible()
    await expect(page.getByText(/logo da empresa/i)).toBeVisible()
  })

  test('aba Usuários visível para admin', async ({ page }) => {
    await page.goto('/configuracoes')
    await expect(page.getByRole('button', { name: /usuário/i })).toBeVisible()
    await page.getByRole('button', { name: /usuário/i }).click()
    await expect(page.getByText(/convidar usuário/i)).toBeVisible()
    await expect(page.getByText(/aerciooliver1@gmail.com/i)).toBeVisible()
  })
})

test.describe('Catálogo de Programas', () => {
  test('catálogo exibe programas padrão do seed', async ({ page }) => {
    await page.goto('/catalogo')
    await expect(page.getByRole('heading', { name: /catálogo de programas/i })).toBeVisible()
    await expect(page.getByText(/Escuta Ativa|Liderança|Estresse/i).first()).toBeVisible()
  })

  test('botão Novo Programa visível', async ({ page }) => {
    await page.goto('/catalogo')
    await expect(page.getByRole('button', { name: /novo programa/i })).toBeVisible()
  })

  test('formulário de novo programa abre ao clicar', async ({ page }) => {
    await page.goto('/catalogo')
    await page.getByRole('button', { name: /novo programa/i }).click()
    await expect(page.getByPlaceholder(/bem-estar organizacional/i)).toBeVisible()
    await expect(page.getByPlaceholder(/objetivo do programa/i)).toBeVisible()
  })
})

test.describe('Privacidade LGPD', () => {
  test('página de privacidade carrega com aviso LGPD', async ({ page }) => {
    await page.goto('/privacidade')
    await expect(page.getByText(/LGPD|Lei nº 13.709/i).first()).toBeVisible()
  })

  test('busca de colaborador filtra lista', async ({ page }) => {
    await page.goto('/privacidade')
    await page.getByPlaceholder(/nome ou e-mail/i).fill('aercio')
    await expect(page.getByText(/aerciooliver1@gmail.com/i)).toBeVisible()
  })

  test('botões de exportar e excluir presentes', async ({ page }) => {
    await page.goto('/privacidade')
    await expect(page.getByRole('button', { name: /exportar json/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /excluir/i })).toBeVisible()
  })
})
