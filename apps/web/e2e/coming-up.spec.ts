import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import type { FakeAnswer } from './support/fake-backend';
import { logInToHome } from './support/fake-home';
import { DAY_MS } from './support/fake-home-state';

const WEEK_DAYS = 7;

function datesIn(url: string): string[] {
  const query = new URL(url).searchParams;
  const from = Date.parse(query.get('from') ?? '');
  const to = Date.parse(query.get('to') ?? '');
  const count = Math.round((to - from) / DAY_MS) + 1;
  return Array.from({ length: count }, (_, index) =>
    new Date(from + index * DAY_MS).toISOString().slice(0, 10),
  );
}

// Answers every agenda request with empty days, except that a request longer
// than a week (Coming up) gets `comingUp` for its dates.
async function fakeAgendaWith(
  page: Page,
  comingUp: (dates: string[]) => FakeAnswer,
): Promise<void> {
  await fakeApi(page, '/v1/households/home-1/agenda*', (request) => {
    const dates = datesIn(request.url());
    if (dates.length > WEEK_DAYS) return comingUp(dates);
    return { body: { late: [], days: dates.map((date) => ({ date, due: [], done: [] })) } };
  });
}

test.describe('Coming up', () => {
  test('lists the next four weeks below this week and opens a job', async ({ page }) => {
    await logInToHome(page);
    await fakeAgendaWith(page, (dates) => ({
      body: {
        late: [],
        days: dates.map((date, index) => ({
          date,
          due:
            index === 1
              ? [{ jobId: 'job-oven', dueDate: date, status: 'later', assignee: null }]
              : [],
          done: [],
        })),
      },
    }));
    await page.goto('/week');
    const comingUp = page.getByRole('region', { name: 'Coming up' });
    await expect(comingUp.getByRole('heading', { level: 3 })).toHaveCount(4);
    await comingUp.getByRole('link', { name: /Clean the oven/ }).click();
    await expect(page.getByRole('heading', { name: 'Clean the oven', level: 1 })).toBeVisible();
  });

  test('explains when the weeks ahead cannot be loaded', async ({ page }) => {
    await logInToHome(page);
    await fakeAgendaWith(page, () => ({
      status: 400,
      body: { error: { code: 'badRequest', message: 'Ask for at most 62 days at a time' } },
    }));
    await page.goto('/week');
    await expect(page.getByRole('heading', { name: 'This week', level: 1 })).toBeVisible();
    const comingUp = page.getByRole('region', { name: 'Coming up' });
    await expect(comingUp.getByRole('alert')).toHaveText('Ask for at most 62 days at a time');
    await expect(comingUp.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
