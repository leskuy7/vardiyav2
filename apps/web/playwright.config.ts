import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  webServer: [
    {
      command: 'set REGISTER_INVITE_CODE=test-invite-code&& npm run -w @vardiya/api dev',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: 'npm run -w @vardiya/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry'
  }
});
