import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('Home and rooms', () => {
  test('shows every room, opens one, and adds a room', async ({ page }) => {
    await logInToHome(page);
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Home' })
      .click();
    await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
    const kitchen = page.getByRole('link', { name: /Kitchen/ });
    await expect(kitchen).toContainText('2 jobs');
    await expect(kitchen).toContainText('1 late');
    await page.getByRole('button', { name: 'Add a room' }).click();
    await page
      .getByRole('dialog', { name: 'Add a room' })
      .getByRole('button', { name: 'Add room' })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Bathroom/ })).toBeVisible();
    await kitchen.click();
    await expect(page.getByRole('heading', { name: 'Kitchen', level: 1 })).toBeVisible();
    const jobs = page.getByRole('list', { name: 'Jobs in Kitchen' }).getByRole('listitem');
    await expect(jobs).toHaveCount(2);
    await expect(jobs.first()).toContainText('Clean the oven');
    await expect(jobs.first()).toContainText('2 days late');
    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  });

  test('explains a room that is not there any more', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/room?id=room-gone');
    await expect(page.getByRole('heading', { name: 'Room not found' })).toBeVisible();
  });

  test('keeps the sheet open and explains when a room cannot be added', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/rooms',
      {
        status: 400,
        body: { error: { code: 'badRequest', message: 'A home can have up to 30 rooms' } },
      },
      { method: 'POST' },
    );
    await page.goto('/home');
    await page.getByRole('button', { name: 'Add a room' }).click();
    const sheet = page.getByRole('dialog', { name: 'Add a room' });
    await sheet.getByRole('button', { name: 'Add room' }).click();
    await expect(sheet.getByRole('alert')).toHaveText('A home can have up to 30 rooms');
  });
});
