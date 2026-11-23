import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('Home settings', () => {
  test('makes an invite code, then leaves the home', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/settings');
    await page.getByRole('link', { name: 'Home settings' }).click();
    await expect(page.getByRole('heading', { name: 'Our flat', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Get an invite code' }).click();
    await expect(page.getByText('7K3M 9QZA')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Invite link' })).toHaveValue(
      /\/join\?code=7K3M9QZA$/,
    );

    await page.getByRole('button', { name: 'Leave this home' }).click();
    await page
      .getByRole('dialog', { name: 'Leave Our flat?' })
      .getByRole('button', { name: 'Leave' })
      .click();
    await page.waitForURL(/\/homes\/new\/?$/);
  });

  test('explains when an invite code cannot be made', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/invites',
      {
        status: 429,
        body: { error: { code: 'tooManyRequests', message: 'Too many invites. Try again later.' } },
      },
      { method: 'POST' },
    );
    await page.goto('/settings/home');
    await page.getByRole('button', { name: 'Get an invite code' }).click();
    await expect(
      page.getByRole('region', { name: 'Invite someone' }).getByRole('alert'),
    ).toContainText('Too many invites');
  });
});
