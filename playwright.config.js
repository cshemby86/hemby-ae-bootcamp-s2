const { defineConfig, devices } = require('@playwright/test');

const FRONTEND_PORT = process.env.FRONTEND_PORT || process.env.PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 3030;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    browserName: 'chromium',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `npm run start:backend`,
      port: Number(BACKEND_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        PORT: String(BACKEND_PORT),
      },
    },
    {
      command: `npm run start:frontend`,
      port: Number(FRONTEND_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        PORT: String(FRONTEND_PORT),
      },
    },
  ],
});
