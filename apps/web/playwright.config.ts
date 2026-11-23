import { defineConfig, devices } from '@playwright/test';
import { E2E_ENVIRONMENT } from './e2e/support/test-environment';

const LOCAL_SERVER_PORT = 3000;
const SERVER_START_TIMEOUT_MS = 120_000;
const LOCAL_SERVER_URL = `http://localhost:${String(LOCAL_SERVER_PORT)}`;
const isCI = Boolean(process.env.CI);
const VIEWPORT_SPECS = /.viewports.spec.ts$/;

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: LOCAL_SERVER_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: VIEWPORT_SPECS },
    { name: 'android', use: { ...devices['Pixel 7'] }, testIgnore: VIEWPORT_SPECS },
    { name: 'iphone', use: { ...devices['iPhone 15'] }, testIgnore: VIEWPORT_SPECS },
    { name: 'viewports', use: { ...devices['Desktop Chrome'] }, testMatch: VIEWPORT_SPECS },
  ],
  webServer: {
    command: isCI ? 'npm run start' : 'npm run dev',
    url: LOCAL_SERVER_URL,
    reuseExistingServer: !isCI,
    timeout: SERVER_START_TIMEOUT_MS,
    env: { ...E2E_ENVIRONMENT },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
