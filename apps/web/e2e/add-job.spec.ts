import { expect, test } from '@playwright/test';
import { fakeApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';

test.describe('Add a job', () => {
  test('adds a library job, then makes your own and opens it', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/room?id=room-kitchen');
    await page.getByRole('link', { name: 'Add a job' }).click();
    await expect(page.getByRole('heading', { name: 'Add a job', level: 1 })).toBeVisible();

    const library = page.getByRole('list', { name: 'Jobs from the library' });
    await page.getByRole('searchbox', { name: 'Search jobs' }).fill('kettle');
    await library.getByRole('button', { name: 'Add Descale the kettle' }).click();
    await expect(library.getByText('Added')).toBeVisible();

    await page.getByRole('button', { name: 'Make your own job' }).click();
    const sheet = page.getByRole('dialog', { name: 'Make your own job' });
    await sheet.getByRole('textbox', { name: 'Name' }).fill('Water the plants');
    await sheet.getByRole('button', { name: 'Add job' }).click();
    await expect(page.getByRole('heading', { name: 'Water the plants', level: 1 })).toBeVisible();
  });

  test('explains when a job cannot be added', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      '/v1/households/home-1/jobs',
      {
        status: 400,
        body: { error: { code: 'badRequest', message: 'A room can have up to 60 jobs' } },
      },
      { method: 'POST' },
    );
    await page.goto('/room/add?id=room-kitchen');
    await page
      .getByRole('list', { name: 'Jobs from the library' })
      .getByRole('button', { name: /^Add / })
      .first()
      .click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'A room can have up to 60 jobs',
    );
  });
});
