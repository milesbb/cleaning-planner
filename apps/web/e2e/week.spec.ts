import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('This week', () => {
  test('shows the week from the tab bar, with today and its jobs, and moves between weeks', async ({
    page,
  }) => {
    await logInToHome(page);
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Week' })
      .click();
    await expect(page.getByRole('heading', { name: 'This week', level: 1 })).toBeVisible();
    const days = page.getByRole('list', { name: 'Days' }).getByRole('listitem');
    await expect(days).toHaveCount(7);
    const today = days.filter({ hasText: 'Today' });
    await expect(today.getByRole('img', { name: 'Wipe the hob, to do' })).toBeVisible();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.getByRole('heading', { name: 'Next week', level: 1 })).toBeVisible();
    await expect(days.filter({ hasText: 'Nothing planned' })).toHaveCount(7);
  });

  test('explains when the week cannot be loaded', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(page, '/v1/households/home-1/agenda*', {
      status: 403,
      body: { error: { code: 'forbidden', message: 'You’re not in that home any more' } },
    });
    await page.goto('/week');
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'You’re not in that home any more',
    );
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
