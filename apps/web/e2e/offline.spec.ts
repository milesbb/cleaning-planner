import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openPage } from './support/fake-backend';

const WELCOME_HEADING = 'Know what needs cleaning, and when.';

async function waitForOfflineCopy(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller !== null) return;
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
    });
  });
}

test.describe('opening the app without a connection', () => {
  test.use({ serviceWorkers: 'allow' });
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Playwright runs service workers in Chromium only',
  );

  test('the app opens offline after one visit', async ({ page, context }) => {
    await openPage(page, '/welcome');
    await waitForOfflineCopy(page);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: WELCOME_HEADING })).toBeVisible();
  });

  test('a page not yet visited also opens offline, from the copy saved on the first visit', async ({
    page,
    context,
  }) => {
    await openPage(page, '/welcome');
    await waitForOfflineCopy(page);
    await context.setOffline(true);
    await page.goto('/sign-in/');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });
});
