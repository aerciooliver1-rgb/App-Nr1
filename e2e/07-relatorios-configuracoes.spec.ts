import { test, expect } from '@playwright/test'

test.use({ storageState: '.playwright/auth.json' })

test.describe('Relatórios', () => {
  test('lista as empresas cadastradas', async ({ page }) => {
    await page.goto('/relatorios')
    await expect(page.getByRole('heading', { name: /relatórios/i })).toBeVisible()
    await expect(page.getByText('HealthTech Soluções')).toBeVisible()
    await expect(page.getByText('Varejo Express Ltda')).toBeVisible()
    await expect(page.getByText('Hospital São Lucas S/A')).toBeVisible()
    await expect(page.getByText('Callcenter Rápido S/A')).toBeVisible()
  })

  test('expandir empresa mostra últimas avaliações global e por setor', async ({ page }) => {
    await page.goto('/relatorios')
    await page.getByText('Hospital São Lucas S/A').click()
    await expect(page.getByText(/última avaliação global/i)).toBeVisible()
    await expect(page.getByText(/últimas avaliações por setor/i)).toBeVisible()
    await expect(page.getByText('UTI e Pronto-Socorro')).toBeVisible()
    await expect(page.getByRole('link', { name: /relatório consolidado/i })).toBeVisible()
  })

  test('expandir setor mostra etapas clicáveis e exportações', async ({ page }) => {
    await page.goto('/relatorios')
    await page.getByText('Hospital São Lucas S/A').click()
    await page.getByRole('button', { name: /uti e pronto-socorro/i }).click()
    await expect(page.getByText(/navegar para/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Resultado' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Intervenções' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Plano de Ação' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Acompanhamento' })).toBeVisible()
    await expect(page.getByRole('link', { name: /pptx/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /pdf/i }).first()).toBeVisible()
  })

  test('etapa navega para o resultado do setor', async ({ page }) => {
    await page.goto('/relatorios')
    await page.getByText('Hospital São Lucas S/A').click()
    await page.getByRole('button', { name: /recepção do p\.a\./i }).click()
    await page.getByRole('link', { name: 'Resultado' }).click()
    await expect(page).toHaveURL(/resultado/)
    await expect(page.getByRole('heading', { name: /resultado do diagnóstico/i })).toBeVisible()
  })

  test('setor com coleta em andamento mostra etapas bloqueadas', async ({ page }) => {
    await page.goto('/relatorios')
    await page.getByText('Hospital São Lucas S/A').click()
    await page.getByRole('button', { name: /núcleo de informática/i }).click()
    // nenhuma etapa clicável enquanto o ciclo não é calculado
    await expect(page.getByRole('link', { name: 'Resultado' })).toHaveCount(0)
    await expect(page.getByText(/aguardando cálculo/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /coleta ativa/i })).toBeVisible()
  })
})

test.describe('Configurações', () => {
  test('aba Perfil exibe formulário de nome e senha', async ({ page }) => {
    await page.goto('/configuracoes')
    await expect(page.getByRole('button', { name: 'Perfil' })).toBeVisible()
    await expect(page.getByText(/nome de exibição/i)).toBeVisible()
  })

  test('aba Perfil exibe campo de registro profissional', async ({ page }) => {
    await page.goto('/configuracoes')
    await expect(page.getByText(/registro profissional/i).first()).toBeVisible()
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
    await expect(page.getByText(/Assédio|Burnout|Liderança/i).first()).toBeVisible()
    // agrupamento por nível de risco e ficha técnica dos programas
    await expect(page.getByText(/crítico — início em até 30 dias/i)).toBeVisible()
    await expect(page.getByText(/carga horária/i).first()).toBeVisible()
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
