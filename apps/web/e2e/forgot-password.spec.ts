import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cognitoError, fakeApi, fakeCognito, openPage } from './support/fake-backend';

async function requestCode(page: Page): Promise<void> {
  await openPage(page, '/sign-in');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('sam@example.com');
  await page.getByRole('button', { name: 'Email me a code' }).click();
  await expect(page).toHaveURL(/\/forgot-password\/reset\/?$/);
}

async function setNewPassword(page: Page, code: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Digit 1 of 6' }).click();
  await page.keyboard.type(code);
  await page.getByLabel('New password', { exact: true }).fill('window pepper gate');
  await page.getByRole('button', { name: 'Save and log in' }).click();
}

test.describe('resetting a forgotten password', () => {
  test('emails a code, sets the new password and logs straight in', async ({ page }) => {
    const backend = await fakeCognito(page);
    await fakeApi(page, '/v1/households', { body: [] });
    await requestCode(page);
    await expect(page.getByText('sam@example.com')).toBeVisible();
    await setNewPassword(page, '719042');
    await expect(page).toHaveURL(/\/homes\/new\/?$/);
    expect(backend.cognitoCalls).toEqual(
      expect.arrayContaining(['ForgotPassword', 'ConfirmForgotPassword', 'InitiateAuth']),
    );
  });

  test('never says whether the email has an account', async ({ page }) => {
    await fakeCognito(page, { ForgotPassword: cognitoError('UserNotFoundException') });
    await requestCode(page);
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible();
  });

  test('explains a wrong code', async ({ page }) => {
    await fakeCognito(page, { ConfirmForgotPassword: cognitoError('CodeMismatchException') });
    await requestCode(page);
    await setNewPassword(page, '000000');
    await expect(
      page.getByText('That code doesn’t match. Check the email and try again.'),
    ).toBeVisible();
  });

  test('explains an expired code and sends a new one', async ({ page }) => {
    const backend = await fakeCognito(page, {
      ConfirmForgotPassword: cognitoError('ExpiredCodeException'),
    });
    await requestCode(page);
    await setNewPassword(page, '719042');
    await expect(
      page.getByText('That code has expired. Send a new code and try again.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Send a new code' }).click();
    await expect(page.getByRole('status')).toHaveText('We’ve sent a new code to sam@example.com.');
    expect(backend.cognitoCalls.filter((call) => call === 'ForgotPassword')).toHaveLength(2);
  });

  test('checks the new password length before sending anything', async ({ page }) => {
    const backend = await fakeCognito(page);
    await requestCode(page);
    await page.getByRole('textbox', { name: 'Digit 1 of 6' }).click();
    await page.keyboard.type('719042');
    await page.getByLabel('New password', { exact: true }).fill('too short');
    await page.getByRole('button', { name: 'Save and log in' }).click();
    await expect(page.getByText('Use at least 12 characters.')).toBeVisible();
    expect(backend.cognitoCalls).not.toContain('ConfirmForgotPassword');
  });
});
