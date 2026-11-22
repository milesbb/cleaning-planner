import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cognitoError, fakeApi, fakeCognito, openPage } from './support/fake-backend';

async function createAccount(page: Page, email = 'sam@example.com'): Promise<void> {
  await openPage(page, '/welcome');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByLabel('Your name', { exact: true }).fill('Sam');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('lemon kettle sunday');
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function typeCode(page: Page, code: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Digit 1 of 6' }).click();
  await page.keyboard.type(code);
}

test.describe('creating an account', () => {
  test('signs up, confirms the email and starts a home', async ({ page }) => {
    const backend = await fakeCognito(page);
    await fakeApi(page, '/v1/households', { body: [] });
    await createAccount(page);
    await expect(page).toHaveURL(/\/verify\/?$/);
    await expect(page.getByText('sam@example.com')).toBeVisible();
    await typeCode(page, '482913');
    await expect(page).toHaveURL(/\/homes\/new\/?$/);
    expect(backend.cognitoCalls).toEqual(
      expect.arrayContaining(['SignUp', 'ConfirmSignUp', 'InitiateAuth']),
    );
  });

  test('says when the email already has an account', async ({ page }) => {
    await fakeCognito(page, { SignUp: cognitoError('UsernameExistsException') });
    await createAccount(page);
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'There’s already an account for this email.',
    );
    await expect(page).toHaveURL(/\/sign-up\/?$/);
  });

  test('checks the password length before sending anything', async ({ page }) => {
    const backend = await fakeCognito(page);
    await openPage(page, '/sign-up');
    await page.getByLabel('Your name', { exact: true }).fill('Sam');
    await page.getByLabel('Email', { exact: true }).fill('sam@example.com');
    await page.getByLabel('Password', { exact: true }).fill('too short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use at least 12 characters.')).toBeVisible();
    expect(backend.cognitoCalls).toEqual([]);
  });

  test('explains a wrong code and an expired code', async ({ page }) => {
    await fakeCognito(page, { ConfirmSignUp: cognitoError('CodeMismatchException') });
    await createAccount(page);
    await typeCode(page, '000000');
    await expect(
      page.getByText('That code doesn’t match. Check the email and try again.'),
    ).toBeVisible();
    await page.unrouteAll();
    await fakeCognito(page, { ConfirmSignUp: cognitoError('ExpiredCodeException') });
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(
      page.getByText('That code has expired. Send a new code and try again.'),
    ).toBeVisible();
  });

  test('sends a new code', async ({ page }) => {
    const backend = await fakeCognito(page);
    await createAccount(page);
    await page.getByRole('button', { name: 'Send a new code' }).click();
    await expect(page.getByRole('status')).toHaveText('We’ve sent a new code to sam@example.com.');
    expect(backend.cognitoCalls).toContain('ResendConfirmationCode');
  });

  test('goes back to use another email', async ({ page }) => {
    await fakeCognito(page);
    await createAccount(page);
    await page.getByRole('link', { name: 'Use another email' }).click();
    await expect(page).toHaveURL(/\/sign-up\/?$/);
  });

  test('picks up a sign-up that was never confirmed when logging in', async ({ page }) => {
    const backend = await fakeCognito(page, {
      RespondToAuthChallenge: cognitoError('UserNotConfirmedException'),
    });
    await openPage(page, '/sign-in');
    await page.getByLabel('Email', { exact: true }).fill('sam@example.com');
    await page.getByLabel('Password', { exact: true }).fill('lemon kettle sunday');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/verify\/?$/);
    await expect(page.getByText('sam@example.com')).toBeVisible();
    expect(backend.cognitoCalls).toContain('ResendConfirmationCode');
  });
});
