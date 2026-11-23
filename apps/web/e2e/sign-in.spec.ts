import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cognitoError, fakeApi, fakeCognito, openPage } from './support/fake-backend';

const OUR_FLAT = [{ id: 'home-1', name: 'Our flat', role: 'owner' }];

async function logIn(page: Page, password = 'lemon kettle sunday'): Promise<void> {
  await page.getByLabel('Email', { exact: true }).fill('sam@example.com');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

test.describe('logging in', () => {
  test('signed out, the start page shows Welcome', async ({ page }) => {
    await openPage(page, '/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Know what needs cleaning, and when.' }),
    ).toBeVisible();
  });

  test('logs in with a home and goes to Today', async ({ page }) => {
    await fakeCognito(page);
    await fakeApi(page, '/v1/households', { body: OUR_FLAT });
    await openPage(page, '/welcome');
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await logIn(page);
    await expect(page).toHaveURL(/\/today\/?$/);
  });

  test('logs in without a home and goes to start one', async ({ page }) => {
    await fakeCognito(page);
    await fakeApi(page, '/v1/households', { body: [] });
    await openPage(page, '/sign-in');
    await logIn(page);
    await expect(page).toHaveURL(/\/homes\/new\/?$/);
  });

  test('sends someone whose session the API rejects back to log in', async ({ page }) => {
    await fakeCognito(page);
    await fakeApi(page, '/v1/households', { status: 401, body: { message: 'Unauthorized' } });
    await openPage(page, '/sign-in');
    await logIn(page);
    await expect(page).toHaveURL(/\/sign-in\/?$/);
  });

  test('gives one message for a wrong password that does not reveal the account', async ({
    page,
  }) => {
    await fakeCognito(page, {
      RespondToAuthChallenge: cognitoError(
        'NotAuthorizedException',
        'Incorrect username or password.',
      ),
    });
    await openPage(page, '/sign-in');
    await logIn(page, 'wrong password');
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'That email and password don’t match. Check for typos, or reset your password.',
    );
  });

  test('asks calmly to wait after too many attempts', async ({ page }) => {
    await fakeCognito(page, {
      RespondToAuthChallenge: cognitoError('NotAuthorizedException', 'Password attempts exceeded'),
    });
    await openPage(page, '/sign-in');
    await logIn(page);
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Too many tries for now. Wait a few minutes, then try again.',
    );
  });

  test('offers its fields to password managers', async ({ page }) => {
    await openPage(page, '/sign-in');
    await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute(
      'autocomplete',
      'username',
    );
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });
});
