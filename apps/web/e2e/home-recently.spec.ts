import { expect, test } from '@playwright/test';
import { fakeApi, openPage } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('What has been done recently, on Home', () => {
  test('shows who did what, newest first, including your own ticks', async ({ page }) => {
    await logInToHome(page);
    await page.getByRole('button', { name: 'Mark Clean the oven as done' }).click();
    await expect(
      page.getByRole('region', { name: 'Done today' }).getByText('Clean the oven'),
    ).toBeVisible();
    await openPage(page, '/home');
    const recently = page.getByRole('list', { name: 'Recently done' }).getByRole('listitem');
    await expect(recently).toHaveText([
      'You · Clean the oven · Today',
      'Sam · Wipe the hob · Yesterday',
    ]);
  });

  test('explains when it cannot be loaded and offers to try again', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(page, '/v1/households/home-1/activity*', {
      status: 403,
      body: { error: { code: 'forbidden', message: 'You’re not in that home any more' } },
    });
    await openPage(page, '/home');
    const section = page.getByRole('region', { name: 'Recently' });
    await expect(section).toContainText(
      'Couldn’t get what’s been done. You’re not in that home any more',
    );
    await expect(section.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
