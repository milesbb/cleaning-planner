import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { fakeApi, holdApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';
import { calendarDay } from './support/fake-home-state';

const MOVE_VACUUM = 'Move Vacuum the living room, to do';

// Today's row and the one after it, or null when today ends the week shown.
async function todayAndTomorrow(page: Page): Promise<{ today: Locator; tomorrow: Locator } | null> {
  const days = page.getByRole('list', { name: 'Days' }).getByRole('listitem');
  await expect(days).toHaveCount(7);
  const texts = await days.allTextContents();
  const todayIndex = texts.findIndex((text) => text.startsWith('Today'));
  if (todayIndex === -1 || todayIndex === texts.length - 1) return null;
  return { today: days.nth(todayIndex), tomorrow: days.nth(todayIndex + 1) };
}

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

  test('drags a job to tomorrow on a laptop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse only');
    await logInToHome(page);
    const snoozes = await holdApi(page, '/v1/households/home-1/jobs/job-vacuum/snooze', 'POST');
    await page.goto('/week');
    const rows = await todayAndTomorrow(page);
    test.skip(rows === null, 'today ends the week, so tomorrow is not shown');
    if (rows === null) return;
    await rows.today.getByRole('button', { name: MOVE_VACUUM }).dragTo(rows.tomorrow);
    await expect(rows.tomorrow.getByRole('img', { name: /Vacuum the living room/ })).toBeVisible();
    await expect(rows.today.getByText(/Vacuum/)).toHaveCount(0);
    expect(snoozes[0]?.postDataJSON()).toMatchObject({ until: calendarDay(1) });
  });

  test('puts a dragged job back and says so when it cannot move', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse only');
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/jobs/*/snooze',
      { status: 400, body: { error: { code: 'badRequest', message: 'Snooze to a later day' } } },
      { method: 'POST' },
    );
    await page.goto('/week');
    const rows = await todayAndTomorrow(page);
    test.skip(rows === null, 'today ends the week, so tomorrow is not shown');
    if (rows === null) return;
    await rows.today.getByRole('button', { name: MOVE_VACUUM }).dragTo(rows.tomorrow);
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Snooze to a later day');
    await expect(rows.today.getByRole('button', { name: MOVE_VACUUM })).toBeVisible();
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
