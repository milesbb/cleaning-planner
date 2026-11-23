import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fakeApi, fakeCognito, openPage } from './support/fake-backend';

const CREATED = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};

async function logInWithoutAHome(page: Page): Promise<void> {
  await fakeCognito(page);
  await fakeApi(page, '/v1/households', { body: [] }, { method: 'GET' });
  await openPage(page, '/sign-in');
  await page.getByLabel('Email', { exact: true }).fill('sam@example.com');
  await page.getByLabel('Password', { exact: true }).fill('lemon kettle sunday');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Let’s set up your home' })).toBeVisible();
}

async function pickRooms(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Start a new home' }).click();
  await expect(page.getByRole('heading', { name: 'Which rooms do you have?' })).toBeVisible();
  await page.getByLabel('Home name').fill('Our flat');
  await page.getByRole('button', { name: 'More bedrooms' }).click();
  await page.getByRole('switch', { name: 'Laundry' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

test.describe('setting up a home', () => {
  test('picks rooms, appliances and reminders, keeps them going back, and creates the home', async ({
    page,
  }) => {
    await logInWithoutAHome(page);
    await fakeApi(page, '/v1/households', { status: 201, body: CREATED }, { method: 'POST' });
    await pickRooms(page);
    await expect(page.getByRole('heading', { name: 'What do you have at home?' })).toBeVisible();
    await page.getByRole('switch', { name: 'Dishwasher' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'When should we nudge you?' })).toBeVisible();
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page.getByRole('switch', { name: 'Dishwasher' })).toBeChecked();
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page.getByLabel('Home name')).toHaveValue('Our flat');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('radio', { name: 'Sunday' }).click();
    const createRequest = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/v1/households'),
    );
    await page.getByRole('button', { name: 'Create home' }).click();
    const body: unknown = (await createRequest).postDataJSON();
    expect(body).toMatchObject({
      name: 'Our flat',
      weekStartsOn: 'sunday',
      rooms: [
        { type: 'kitchen', name: 'Kitchen' },
        { type: 'laundry', name: 'Laundry' },
        { type: 'bathroom', name: 'Bathroom' },
        { type: 'bedroom', name: 'Bedroom' },
        { type: 'bedroom', name: 'Bedroom 2' },
        { type: 'livingRoom', name: 'Living room' },
      ],
      features: ['oven', 'kettle', 'washingMachine', 'hardFloor', 'dishwasher'],
    });
    await expect(page).toHaveURL(/\/today\/?$/);
  });

  test('explains when the home cannot be created, and keeps the choices', async ({ page }) => {
    await logInWithoutAHome(page);
    await fakeApi(
      page,
      '/v1/households',
      { status: 500, body: { error: { code: 'internal', message: 'Something broke' } } },
      { method: 'POST' },
    );
    await pickRooms(page);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Create home' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'Something went wrong on our side. Try again in a moment.',
    );
    await expect(page.getByRole('button', { name: 'Create home' })).toBeEnabled();
    await page.getByRole('link', { name: 'Back' }).click();
    await page.getByRole('link', { name: 'Back' }).click();
    await expect(page.getByLabel('Home name')).toHaveValue('Our flat');
  });

  test('needs at least one room before going on', async ({ page }) => {
    await openPage(page, '/setup/rooms');
    for (const room of ['Kitchen', 'Living room']) {
      await page.getByRole('switch', { name: room }).click();
    }
    await page.getByRole('button', { name: 'Fewer bathrooms' }).click();
    await page.getByRole('button', { name: 'Fewer bedrooms' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Pick at least one room');
    await expect(page).toHaveURL(/\/setup\/rooms\/?$/);
  });
});
