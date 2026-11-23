import { expect, test } from '@playwright/test';
import { logInToHome } from './support/fake-home';

test.describe('Job detail', () => {
  test('opens a job from Today, marks it done, renames it and removes it', async ({ page }) => {
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
