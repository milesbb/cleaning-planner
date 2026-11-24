import { expect, test } from '@playwright/test';
import { fakeCognito, openPage } from './support/fake-backend';
import { fakeHome, logInToHome } from './support/fake-home';

test.describe('every address leads somewhere sensible', () => {
  test('sends someone signed in from Welcome, Log in or Create account on to their homes', async ({
    page,
  }) => {
    await logInToHome(page);
    for (const path of ['/welcome', '/sign-up']) {
      await page.goto(path);
      await page.waitForURL(/\/today\/?$/);
    }
    await page.goto(`/sign-in?next=${encodeURIComponent('/week')}`);
    await page.waitForURL(/\/week\/?$/);
  });

  test('asks someone signed out to log in before Help, then brings them back', async ({ page }) => {
    await fakeCognito(page);
    await fakeHome(page, {});
    await openPage(page, '/help');
    await page.waitForURL(/\/sign-in\/\?next=%2Fhelp/);
    await page.getByLabel('Email', { exact: true }).fill('alex@example.com');
    await page.getByLabel('Password', { exact: true }).fill('lemon kettle sunday');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('heading', { name: 'Help', level: 1 })).toBeVisible();
  });

  test('asks someone signed out to log in before setting up a home', async ({ page }) => {
    await openPage(page, '/setup/rooms');
    await page.waitForURL(/\/sign-in\/\?next=%2Fsetup%2Frooms/);
    await expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible();
  });

  test('opens Today instead of “You’re all set” when no home was just created', async ({
    page,
  }) => {
    await logInToHome(page);
    await page.goto('/setup/done');
    await page.waitForURL(/\/today\/?$/);
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  });
});
