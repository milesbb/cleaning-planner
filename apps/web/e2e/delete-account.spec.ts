import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cognitoError, fakeApi, fakeCognito } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

async function openDeleteAccount(page: Page): Promise<void> {
  await logInToHome(page, { isOwner: true });
  await fakeApi(page, '/v1/me', { status: 204, body: undefined }, { method: 'DELETE' });
  await page.goto('/settings/account');
  await page.getByRole('link', { name: 'Delete account' }).click();
  await expect(page.getByRole('heading', { name: 'Delete account', level: 1 })).toBeVisible();
}

async function deleteWithPassword(page: Page, password: string): Promise<void> {
  await page.getByLabel('Your password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Delete my account' }).click();
}

test.describe('Delete account', () => {
  test('hands the home over, deletes the account and goes back to Welcome', async ({ page }) => {
    await openDeleteAccount(page);
    const backend = await fakeCognito(page);
    await page
      .getByRole('radiogroup', { name: 'Who looks after Our flat?' })
      .getByRole('radio', { name: 'Sam' })
      .click();
    await deleteWithPassword(page, 'lemon kettle sunday');
    await page.waitForURL(/\/welcome\/?$/);
    expect(backend.cognitoCalls).toEqual(expect.arrayContaining(['InitiateAuth']));
  });

  test('asks who looks after a shared home first', async ({ page }) => {
    await openDeleteAccount(page);
    await deleteWithPassword(page, 'lemon kettle sunday');
    await expect(page.getByText('Choose who looks after Our flat, or delete it')).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/account\/delete\/?$/);
  });

  test('stays on the page when the password is wrong', async ({ page }) => {
    await openDeleteAccount(page);
    await fakeCognito(page, {
      RespondToAuthChallenge: cognitoError('NotAuthorizedException', 'Incorrect password.'),
    });
    await page
      .getByRole('radiogroup', { name: 'Who looks after Our flat?' })
      .getByRole('radio', { name: 'Delete Our flat' })
      .click();
    await deleteWithPassword(page, 'lemon kettle');
    await expect(page.getByText('That isn’t your current password.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete my account' })).toBeEnabled();
    await expect(page).toHaveURL(/\/settings\/account\/delete\/?$/);
  });
});
