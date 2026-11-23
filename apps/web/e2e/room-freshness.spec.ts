import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';
import { calendarDay, HOME_PATH } from './support/fake-home-state';

const WEEKLY_DAYS = 7;

function doneDaysAgo(jobId: string, daysAgo: number): Record<string, unknown> {
  return {
    jobId,
    nextDueDate: calendarDay(WEEKLY_DAYS - daysAgo),
    snooze: null,
    latestCompletion: {
      jobId,
      outcome: 'done',
      completedOn: calendarDay(-daysAgo),
      completedBy: 'user-sam',
      doneAt: `${calendarDay(-daysAgo)}T09:00:00.000Z`,
    },
  };
}

test.describe('Room freshness', () => {
  test('shows how fresh each job is, calmly once it is due', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(page, `${HOME_PATH}/progress`, {
      body: [doneDaysAgo('job-hob', 2), doneDaysAgo('job-oven', 9)],
    });
    await page.goto('/room?id=room-kitchen');
    const jobs = page.getByRole('list', { name: 'Jobs in Kitchen' });
    await expect(
      jobs
        .getByRole('listitem')
        .filter({ hasText: 'Wipe the hob' })
        .getByRole('meter', { name: 'Freshness' }),
    ).toHaveAttribute('aria-valuetext', 'Fresh for about 5 more days');
    await expect(
      jobs
        .getByRole('listitem')
        .filter({ hasText: 'Clean the oven' })
        .getByRole('meter', { name: 'Freshness' }),
    ).toHaveAttribute('aria-valuetext', 'Ready for a clean');
  });

  test('shows no bar for a job whose progress is missing', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(page, `${HOME_PATH}/progress`, { body: [doneDaysAgo('job-hob', 2)] });
    await page.goto('/room?id=room-kitchen');
    const oven = page
      .getByRole('list', { name: 'Jobs in Kitchen' })
      .getByRole('listitem')
      .filter({ hasText: 'Clean the oven' });
    await expect(oven).toBeVisible();
    await expect(oven.getByRole('meter')).toHaveCount(0);
  });
});
