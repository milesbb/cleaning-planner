import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('Settings', () => {
  test('changes your name and colour in Your account, then signs out', async ({ page }) => {
    await logInToHome(page);
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Settings' })
      .click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Our flat' })).toContainText('Sam');

    await page.getByRole('link', { name: 'Your account' }).click();
    await page.getByRole('button', { name: 'Change name and colour' }).click();
    const sheet = page.getByRole('dialog', { name: 'Your name and colour' });
    await sheet.getByRole('textbox', { name: 'Name' }).fill('Lex');
    await sheet.getByRole('radio', { name: 'Teal' }).click();
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Your details' })).toContainText('Lex');
    await page.getByRole('link', { name: 'Back to Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'You', exact: true })).toContainText('Lex');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/\/welcome\/?$/);
    await page.goto('/today');
    await page.waitForURL(/\/sign-in\//);
  });

  test('keeps the sheet open and explains when a change cannot be saved', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/me',
      { status: 400, body: { error: { code: 'badRequest', message: 'Keep it to 40 characters' } } },
      { method: 'PATCH' },
    );
    await page.goto('/settings/account');
    await page.getByRole('button', { name: 'Change name and colour' }).click();
    const sheet = page.getByRole('dialog', { name: 'Your name and colour' });
    await sheet.getByRole('radio', { name: 'Green' }).click();
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(sheet.getByRole('alert')).toHaveText('Keep it to 40 characters');
  });
});
