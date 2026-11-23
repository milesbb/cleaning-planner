import { expect, test } from '@playwright/test';
import { cognitoError, fakeCognito } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

async function changePassword(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/settings');
  await page.getByRole('link', { name: 'Change password' }).click();
  await page.getByLabel('Current password', { exact: true }).fill('lemon kettle sunday');
  await page.getByLabel('New password', { exact: true }).fill('window pepper gate');
  await page.getByRole('button', { name: 'Change password' }).click();
}

test.describe('Change password', () => {
  test('changes the password, logging out other devices and staying logged in here', async ({
    page,
  }) => {
    await logInToHome(page);
    const backend = await fakeCognito(page);
    await changePassword(page);
    await expect(page.getByRole('status')).toHaveText('Your password has been changed.');
    expect(backend.cognitoCalls).toEqual(
      expect.arrayContaining(['ChangePassword', 'GlobalSignOut', 'InitiateAuth']),
    );
    await page.getByRole('link', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  });

  test('says when the current password is wrong', async ({ page }) => {
    await logInToHome(page);
    await fakeCognito(page, {
      ChangePassword: cognitoError('NotAuthorizedException', 'Incorrect username or password.'),
    });
    await changePassword(page);
    await expect(page.getByText('That isn’t your current password.')).toBeVisible();
  });
});
