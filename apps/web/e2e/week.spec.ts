import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';
import { calendarDay } from './support/fake-home-state';

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
    await expect(today.getByRole('button', { name: 'Move Wipe the hob, to do' })).toBeVisible();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.getByRole('heading', { name: 'Next week', level: 1 })).toBeVisible();
    await expect(days.filter({ hasText: 'Nothing planned' })).toHaveCount(7);
  });

  test('says roughly how long each day will take, leaving out what is done', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/week');
    const today = page
      .getByRole('list', { name: 'Days' })
      .getByRole('listitem')
      .filter({ hasText: 'Today' });
    await expect(today).toContainText('about 20 min');
    await page.goto('/today');
    await page.getByRole('button', { name: 'Mark Wipe the hob as done' }).click();
    await page.goto('/week');
    await expect(today).toContainText('about 10 min');
  });

  test('moves a job to a later day from its tile', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/week');
    await page.getByRole('button', { name: 'Move Vacuum the living room, to do' }).click();
    const sheet = page.getByRole('dialog', { name: 'Move Vacuum the living room to…' });
    const moved = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/snooze'),
    );
    await sheet.getByRole('list', { name: 'Move to' }).getByRole('button').first().click();
    expect((await moved).postDataJSON()).toMatchObject({ until: calendarDay(1) });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  });

  test('puts a job back and says so when it cannot move', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/jobs/*/snooze',
      { status: 400, body: { error: { code: 'badRequest', message: 'Snooze to a later day' } } },
      { method: 'POST' },
    );
    await page.goto('/week');
    await page.getByRole('button', { name: 'Move Vacuum the living room, to do' }).click();
    await page
      .getByRole('dialog', { name: 'Move Vacuum the living room to…' })
      .getByRole('list', { name: 'Move to' })
      .getByRole('button')
      .first()
      .click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Snooze to a later day');
    await expect(
      page.getByRole('button', { name: 'Move Vacuum the living room, to do' }),
    ).toBeVisible();
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
