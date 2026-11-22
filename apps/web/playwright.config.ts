import { defineConfig, devices } from '@playwright/test';

const port = 3000;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${String(port)}`,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: isCI ? 'npm run start' : 'npm run dev',
    url: `http://localhost:${String(port)}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
