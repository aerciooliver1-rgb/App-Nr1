import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('página de login carrega corretamente', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/NR-1|login/i)
    await expect(page.getByLabel(/e-mail/i)).toBeVisible()
    await expect(page.getByLabel(/senha/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('login com credenciais inválidas exibe erro', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-mail/i).fill('invalido@teste.com')
    await page.getByLabel(/senha/i).fill('senhaerrada')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page.getByText(/inválid|incorret|erro/i)).toBeVisible({ timeout: 8000 })
  })

  test('login com credenciais válidas redireciona ao dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-mail/i).fill('aerciooliver1@gmail.com')
    await page.getByLabel(/senha/i).fill('Admin@2026')
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('rota protegida redireciona para login', async ({ page }) => {
    await page.goto('/empresas')
    await expect(page).toHaveURL(/login/)
  })

  test('link de recuperação de senha funciona', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /esquec|recuper/i }).click()
    await expect(page).toHaveURL(/recuperar-senha/)
  })
})
