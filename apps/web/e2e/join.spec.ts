import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fakeApi, fakeCognito, openPage } from './support/fake-backend';
import type { FakeAnswer } from './support/fake-backend';

const CODE = '7K3M9QZA';
const PREVIEW = {
  householdName: 'Our flat',
  invitedByName: 'Sam',
  memberCount: 1,
  expiresAt: '2030-11-30T09:00:00.000Z',
  isMember: false,
};
const JOINED = { id: 'home-1', name: 'Our flat', role: 'member' };

async function logIn(page: Page): Promise<void> {
  await page.getByLabel('Email', { exact: true }).fill('alex@example.com');
  await page.getByLabel('Password', { exact: true }).fill('lemon kettle sunday');
  await page.getByRole('button', { name: 'Log in' }).click();
}

function apiError(status: number, code: string, message: string): FakeAnswer {
  return { status, body: { error: { code, message } } };
}

test.describe('joining a home', () => {
  test('an invite link opened signed out comes back after logging in, and joins', async ({
    page,
  }) => {
    await fakeCognito(page);
    await fakeApi(page, `/v1/invites/${CODE}`, { body: PREVIEW });
    await fakeApi(page, `/v1/invites/${CODE}/accept`, { body: JOINED });
    await openPage(page, `/join?code=${CODE}`);
    await expect(page.getByRole('heading', { name: 'You’re invited to a home' })).toBeVisible();
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await logIn(page);
    await expect(page.getByRole('heading', { name: 'Join Our flat' })).toBeVisible();
    await expect(page.getByText('Sam invited you. 1 person lives there now.')).toBeVisible();
    await page.getByRole('button', { name: 'Join Our flat' }).click();
    await expect(page).toHaveURL(/\/today\/?$/);
  });

  test('someone without a home can type a code, and hears when it has expired', async ({
    page,
  }) => {
    await fakeCognito(page);
    await fakeApi(page, '/v1/households', { body: [] });
    await fakeApi(
      page,
      `/v1/invites/${CODE}`,
      apiError(410, 'gone', 'That invite has expired. Ask for a new one.'),
    );
    await openPage(page, '/sign-in');
    await logIn(page);
    await expect(page.getByRole('heading', { name: 'Let’s set up your home' })).toBeVisible();
    await page.getByLabel('Invite code').fill('7k3m 9qza');
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(page.getByLabel('Invite code')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Invite code').fill(CODE.toLowerCase());
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'That invite has expired. Ask for a new one.',
    );
    await page.getByRole('link', { name: 'Enter a code instead' }).click();
    await expect(page).toHaveURL(/\/homes\/new\/?$/);
  });

  test('explains an unknown code', async ({ page }) => {
    await fakeCognito(page);
    await fakeApi(page, '/v1/households', { body: [] });
    await fakeApi(
      page,
      `/v1/invites/${CODE}`,
      apiError(404, 'notFound', 'That invite code isn’t valid. Ask for a new one.'),
    );
    await openPage(page, '/sign-in');
    await logIn(page);
    await expect(page.getByRole('heading', { name: 'Let’s set up your home' })).toBeVisible();
    await page.goto(`/join?code=${CODE}`);
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'That invite code isn’t valid. Ask for a new one.',
    );
  });

  test('someone who already lives there goes straight to the home', async ({ page }) => {
    await fakeCognito(page);
    await fakeApi(page, `/v1/invites/${CODE}`, { body: { ...PREVIEW, isMember: true } });
    await openPage(page, `/join?code=${CODE}`);
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await logIn(page);
    await expect(page).toHaveURL(/\/today\/?$/);
  });
});
