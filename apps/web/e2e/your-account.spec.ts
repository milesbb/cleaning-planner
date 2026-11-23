import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('Your account', () => {
  test('opens from Settings and shows your details and homes', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/settings');
    await page.getByRole('link', { name: 'Your account' }).click();
    await expect(page.getByRole('heading', { name: 'Your account', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Your details' })).toContainText(
      'alex@example.com',
    );
    await page
      .getByRole('region', { name: 'Your homes' })
      .getByRole('button', { name: /Our flat/ })
      .click();
    await page.waitForURL(/\/settings\/home\/?$/);
    await expect(page.getByRole('heading', { name: 'Our flat', level: 1 })).toBeVisible();
  });

  test('explains when your account cannot be loaded', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/me',
      { status: 400, body: { error: { code: 'badRequest', message: 'Your account is busy' } } },
      { method: 'GET' },
    );
    await page.goto('/settings/account');
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Your account is busy');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
