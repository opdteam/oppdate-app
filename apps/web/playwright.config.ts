import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'yarn workspace @oppdate/api dev',
      cwd: '../../',
      port: 4000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'yarn workspace @oppdate/web dev',
      cwd: '../../',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
