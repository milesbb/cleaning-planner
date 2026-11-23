import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fakeApi, openPage } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

function roomNames(page: Page, listName: string): Promise<string[]> {
  return page.getByRole('list', { name: listName }).getByRole('listitem').allInnerTexts();
}

test.describe('Putting rooms in your own order', () => {
  test('moves a room and keeps the order after leaving Home', async ({ page }) => {
    await logInToHome(page);
    await openPage(page, '/home');
    await page.getByRole('button', { name: 'Reorder rooms' }).click();
    await page.getByRole('button', { name: 'Move Kitchen down' }).click();
    await expect(page.getByRole('status')).toHaveText('Kitchen is now 2 of 2');
    await expect(page.getByRole('button', { name: 'Move Kitchen up' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    await page.getByRole('button', { name: 'Done' }).click();
    await expect
      .poll(() => roomNames(page, 'Rooms'))
      .toEqual([expect.stringContaining('Living room'), expect.stringContaining('Kitchen')]);
    await openPage(page, '/today');
    await openPage(page, '/home');
    await expect
      .poll(() => roomNames(page, 'Rooms'))
      .toEqual([expect.stringContaining('Living room'), expect.stringContaining('Kitchen')]);
  });

  test('puts the list back and says so when the order cannot be saved', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/rooms/*',
      { status: 500, body: { error: { code: 'internal', message: 'Broke' } } },
      { method: 'PATCH' },
    );
    await openPage(page, '/home');
    await page.getByRole('button', { name: 'Reorder rooms' }).click();
    await page.getByRole('button', { name: 'Move Kitchen down' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'The new order wasn’t saved.' }),
    ).toBeVisible();
    await expect
      .poll(() => roomNames(page, 'Room order'))
      .toEqual([expect.stringContaining('Kitchen'), expect.stringContaining('Living room')]);
  });
});
