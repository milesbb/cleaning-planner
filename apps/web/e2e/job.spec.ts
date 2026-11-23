import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';
import { calendarDay } from './support/fake-home-state';

test.describe('Job detail', () => {
  test('opens a job from Today, marks it done, renames it and removes it', async ({
    page,
    isMobile,
  }) => {
    // The page itself; on a laptop the job opens beside the list (job-panel.spec.ts).
    if (!isMobile) await page.setViewportSize({ width: 1023, height: 800 });
    await logInToHome(page);
    await page.getByRole('link', { name: /Clean the oven/ }).click();
    await expect(page.getByRole('heading', { name: 'Clean the oven', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'How to do it' })).toContainText(
      'bicarbonate of soda',
    );
    await page.getByRole('button', { name: 'Mark as done' }).click();
    await expect(page.getByRole('status')).toHaveText('Marked as done');
    await expect(page.getByRole('list', { name: 'Times done' })).toContainText('Done by You on');

    await page.getByRole('button', { name: 'Rename' }).click();
    const renameSheet = page.getByRole('dialog', { name: 'Rename job' });
    await renameSheet.getByRole('textbox', { name: 'Name' }).fill('Clean the oven racks');
    await renameSheet.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByRole('heading', { name: 'Clean the oven racks', level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Remove job' }).click();
    await page
      .getByRole('dialog', { name: 'Remove this job?' })
      .getByRole('button', { name: 'Remove' })
      .click();
    await expect(page.getByRole('heading', { name: 'Kitchen', level: 1 })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Jobs in Kitchen' })).not.toContainText(
      'Clean the oven',
    );
  });

  test('changes how often a job repeats and who does it', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/job?id=job-oven');
    await page.getByRole('button', { name: 'Change how often' }).click();
    const howOften = page.getByRole('dialog', { name: 'How often' });
    await howOften.getByRole('button', { name: 'Use the recommendation: every 3 months' }).click();
    await expect(howOften.getByText('Recommended')).toBeVisible();
    await howOften.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('region', { name: 'How often' })).toContainText('Every 3 months');

    await page.getByRole('button', { name: 'Change who does it' }).click();
    const whoDoesIt = page.getByRole('dialog', { name: 'Who does it' });
    await whoDoesIt.getByRole('radio', { name: 'Sam' }).click();
    await whoDoesIt.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('region', { name: 'Who does it' })).toContainText('Sam');
  });

  test('changes how long a job takes and moves it to another room', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/job?id=job-oven');
    await page.getByRole('button', { name: 'Change how long it takes' }).click();
    const howLong = page.getByRole('dialog', { name: 'How long it takes' });
    await howLong.getByRole('button', { name: 'More minutes' }).click();
    await howLong.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('region', { name: 'How long it takes' })).toContainText(
      'About 15 minutes',
    );

    await page.getByRole('button', { name: 'Move to another room' }).click();
    const move = page.getByRole('dialog', { name: 'Move to another room' });
    await move.getByRole('combobox', { name: 'Room' }).selectOption({ label: 'Living room' });
    await move.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('region', { name: 'Room' })).toContainText('Living room');
  });

  test('keeps the sheet open when a change cannot be saved', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/jobs/*',
      {
        status: 409,
        body: { error: { code: 'conflict', message: 'Someone else changed this job' } },
      },
      { method: 'PATCH' },
    );
    await page.goto('/job?id=job-oven');
    await page.getByRole('button', { name: 'Change how long it takes' }).click();
    const howLong = page.getByRole('dialog', { name: 'How long it takes' });
    await howLong.getByRole('button', { name: 'Fewer minutes' }).click();
    await howLong.getByRole('button', { name: 'Save' }).click();
    await expect(howLong.getByRole('alert')).toHaveText('Someone else changed this job');
  });

  test('snoozes a job to a later day', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/job?id=job-hob');
    await page.getByRole('button', { name: 'Snooze' }).click();
    await page
      .getByRole('dialog', { name: 'Snooze' })
      .getByRole('button', { name: /In 3 days/ })
      .click();
    await expect(page.getByRole('status')).toContainText('Snoozed until');
  });

  test('marks a job done on an earlier day', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/job?id=job-hob');
    await page.getByRole('button', { name: 'Done on another day…' }).click();
    const sheet = page.getByRole('dialog', { name: 'Done on another day' });
    const saved = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/completions'),
    );
    await sheet.getByRole('button', { name: /Yesterday/ }).click();
    expect((await saved).postDataJSON()).toMatchObject({
      outcome: 'done',
      completedOn: calendarDay(-1),
    });
    await expect(page.getByRole('status')).toContainText('Marked as done on');
  });

  test('turns down today as an earlier day', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/job?id=job-hob');
    await page.getByRole('button', { name: 'Done on another day…' }).click();
    const sheet = page.getByRole('dialog', { name: 'Done on another day' });
    await sheet.getByLabel('Another day').fill(calendarDay(0));
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(sheet.getByText('Pick a day before today, or use Mark as done')).toBeVisible();
  });

  test('explains when marking a job done fails', async ({ page }) => {
    await logInToHome(page, { failTicks: true });
    await page.goto('/job?id=job-oven');
    await page.getByRole('button', { name: 'Mark as done' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('explains a job that is not there any more', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/job?id=job-gone');
    await expect(page.getByRole('heading', { name: 'Job not found' })).toBeVisible();
  });
});
