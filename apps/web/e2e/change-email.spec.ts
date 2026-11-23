import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cognitoError, fakeApi, fakeCognito } from './support/fake-backend';
import type { CognitoAnswers, FakeBackend } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

const NEW_EMAIL = 'alex@new.example';

async function startChangingEmail(page: Page, answers: CognitoAnswers = {}): Promise<FakeBackend> {
  await logInToHome(page);
  const backend = await fakeCognito(page, answers);
  await fakeApi(
    page,
    '/v1/me/email',
    { body: { id: 'user-alex', name: 'Alex', email: NEW_EMAIL, colour: 'pink' } },
    { method: 'POST' },
  );
  await page.goto('/settings/account');
  await page.getByRole('link', { name: 'Change email' }).click();
  await page.getByLabel('New email').fill(NEW_EMAIL);
  await page.getByRole('button', { name: 'Send code' }).click();
  return backend;
}

async function enterCode(page: Page, code: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Digit 1 of 6' }).click();
  await page.keyboard.type(code);
}

test.describe('Change email', () => {
  test('sends a code to the new email and changes it once confirmed', async ({ page }) => {
    const backend = await startChangingEmail(page);
    await expect(page.getByText(`We’ve sent a 6-digit code to ${NEW_EMAIL}`)).toBeVisible();
    await enterCode(page, '123456');
    await expect(page.getByRole('status')).toHaveText(`Your email is now ${NEW_EMAIL}.`);
    expect(backend.cognitoCalls).toEqual(
      expect.arrayContaining(['UpdateUserAttributes', 'VerifyUserAttribute']),
    );
    await page.getByRole('link', { name: 'Done' }).click();
    await expect(page.getByRole('region', { name: 'Your details' })).toContainText(NEW_EMAIL);
  });

  test('says when another account already uses the new email', async ({ page }) => {
    await startChangingEmail(page, {
      UpdateUserAttributes: cognitoError('AliasExistsException', 'An account already exists.'),
    });
    await expect(page.getByText('Another account already uses that email.')).toBeVisible();
    await expect(page.getByLabel('New email')).toHaveValue(NEW_EMAIL);
  });

  test('says when the code is wrong', async ({ page }) => {
    await startChangingEmail(page, {
      VerifyUserAttribute: cognitoError('CodeMismatchException', 'Invalid code.'),
    });
    await enterCode(page, '000000');
    await expect(page.getByText('That code doesn’t match.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm email' })).toBeEnabled();
  });
});
