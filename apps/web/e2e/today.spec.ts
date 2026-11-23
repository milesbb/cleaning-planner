import { expect, test } from '@playwright/test';
import { logInToHome } from './support/fake-home';

test.describe('Today', () => {
  test('shows what is late and due, and ticks a job off', async ({ page }) => {
    await logInToHome(page);
    const late = page.getByRole('region', { name: 'Late' });
    const today = page.getByRole('region', { name: 'Today', exact: true });
    await expect(late.getByText('Clean the oven')).toBeVisible();
    await expect(late.getByText('2 days late')).toBeVisible();
    await expect(today.getByText('Wipe the hob')).toBeVisible();
    await page.getByRole('button', { name: 'Mark Wipe the hob as done' }).click();
    const done = page.getByRole('region', { name: 'Done today' });
    await expect(done.getByText('Wipe the hob')).toBeVisible();
    await expect(done.getByText('Done by you')).toBeVisible();
    await expect(today.getByText('Wipe the hob')).toHaveCount(0);
  });

  test('ends on the all-done state once everything is ticked', async ({ page }) => {
    await logInToHome(page);
    for (const job of ['Clean the oven', 'Vacuum the living room', 'Wipe the hob']) {
      await page.getByRole('button', { name: `Mark ${job} as done` }).click();
      await expect(page.getByRole('region', { name: 'Done today' }).getByText(job)).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'All done for today' })).toBeVisible();
  });

  test('puts a job back and says so when the tick fails', async ({ page }) => {
    await logInToHome(page, { failTicks: true });
    await page.getByRole('button', { name: 'Mark Wipe the hob as done' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Something went wrong on our side. Try again in a moment.',
    );
    await expect(
      page.getByRole('region', { name: 'Today', exact: true }).getByText('Wipe the hob'),
    ).toBeVisible();
  });
});
