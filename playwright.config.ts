import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://app-psi-lake-85.vercel.app',
    trace: 'on',
    screenshot: 'on',
    video: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      // Testes que NÃO precisam de autenticação
      name: 'chromium-unauth',
      testMatch: '**/01-login.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Testes que precisam de autenticação
      name: 'chromium',
      testIgnore: '**/01-login.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth.json',
      },
      dependencies: ['setup'],
    },
  ],
  outputDir: './test-results',
})
