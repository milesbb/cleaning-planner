import { expect, test } from '@playwright/test';
import { fakeCognito } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('A link that goes nowhere', () => {
  test('answers 404 with a calm page that leads back to the start', async ({ page }) => {
    await fakeCognito(page);
    const response = await page.goto('/no-such-page/');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'We couldn’t find that page', level: 1 }),
    ).toBeVisible();
    await expect(page).toHaveTitle(/Page not found/);
    await page.getByRole('link', { name: 'Go to the start' }).click();
    await page.waitForURL(/\/welcome\/?$/);
  });

  test('leads someone signed in back to Today', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/old/link?id=job-gone');
    await page.getByRole('link', { name: 'Go to Today' }).click();
    await page.waitForURL(/\/today\/?$/);
  });
});
