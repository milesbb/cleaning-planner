import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { fakeApi, openPage } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

async function openEditRoom(page: Page, roomId: string, roomName: string): Promise<Locator> {
  await openPage(page, `/room?id=${roomId}`);
  await expect(page.getByRole('heading', { name: roomName, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Edit room' }).click();
  return page.getByRole('dialog', { name: 'Edit room' });
}

test.describe('Editing and removing a room', () => {
  test('renames a room, then removes another and goes back to Home', async ({ page }) => {
    await logInToHome(page);
    const sheet = await openEditRoom(page, 'room-kitchen', 'Kitchen');
    await sheet.getByRole('textbox', { name: 'Name' }).fill('Galley');
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Galley', level: 1 })).toBeVisible();

    const living = await openEditRoom(page, 'room-living', 'Living room');
    await living.getByRole('button', { name: 'Remove room' }).click();
    await expect(page.getByRole('dialog', { name: 'Remove this room?' })).toContainText(
      '“Living room” and its 1 job will be removed for everyone in this home.',
    );
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await page.waitForURL(/\/home\/?$/);
    await expect(page.getByRole('link', { name: /Galley/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Living room/ })).toHaveCount(0);
  });

  test('ticking an appliance adds its jobs to the room', async ({ page }) => {
    await logInToHome(page);
    const sheet = await openEditRoom(page, 'room-kitchen', 'Kitchen');
    await expect(sheet).toContainText('Ticking one adds its usual jobs.');
    await sheet.getByRole('checkbox', { name: 'Dishwasher' }).check();
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const jobs = page.getByRole('list', { name: 'Jobs in Kitchen' });
    await expect(jobs).toContainText('Clean the dishwasher filter');
    await expect(page.getByText('5 jobs')).toBeVisible();
  });

  test('explains a name that is too long and saves nothing', async ({ page }) => {
    await logInToHome(page);
    const sheet = await openEditRoom(page, 'room-kitchen', 'Kitchen');
    await sheet.getByRole('textbox', { name: 'Name' }).fill('K'.repeat(51));
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(sheet.getByText('Keep it to 50 characters')).toBeVisible();
    await expect(sheet).toBeVisible();
  });

  test('offers to reload when someone else changed the room first', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/rooms/*',
      {
        status: 409,
        body: {
          error: {
            code: 'conflict',
            message: 'Someone else changed this room. Reload and try again.',
          },
        },
      },
      { method: 'PATCH' },
    );
    const sheet = await openEditRoom(page, 'room-kitchen', 'Kitchen');
    await sheet.getByRole('textbox', { name: 'Name' }).fill('Galley');
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(sheet.getByRole('alert')).toHaveText(
      'Someone else changed this room. Reload and try again.',
    );
    await expect(sheet.getByRole('button', { name: 'Reload' })).toBeVisible();
  });
});
