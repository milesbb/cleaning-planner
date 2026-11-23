import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { logInToHome } from './support/fake-home';
import { waitForOfflineCopy } from './support/service-worker';

const OFFLINE_NOTICE = 'You’re offline. This is what was saved on this device.';

function countTicksSent(page: Page): () => number {
  let ticksSent = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/completions')) ticksSent += 1;
  });
  return () => ticksSent;
}

test.describe('working offline', () => {
  test('a job ticked offline shows as done at once and reaches the API exactly once when back online', async ({
    page,
    context,
  }) => {
    await logInToHome(page);
    const markWipeTheHobDone = page.getByRole('button', { name: 'Mark Wipe the hob as done' });
    await expect(markWipeTheHobDone).toBeVisible();
    const ticksSent = countTicksSent(page);
    await context.setOffline(true);
    await expect(page.getByText(OFFLINE_NOTICE)).toBeVisible();

    await markWipeTheHobDone.click();
    await expect(
      page.getByRole('region', { name: 'Done today' }).getByText('Wipe the hob'),
    ).toBeVisible();
    expect(ticksSent()).toBe(0);

    await context.setOffline(false);
    await expect(page.getByText(OFFLINE_NOTICE)).toHaveCount(0);
    await expect.poll(ticksSent).toBe(1);
    await expect(
      page.getByRole('region', { name: 'Done today' }).getByText('Wipe the hob'),
    ).toBeVisible();
    expect(ticksSent()).toBe(1);
  });

  test('the offline notice goes away when the connection comes back, without a tap', async ({
    page,
    context,
  }) => {
    await logInToHome(page);
    await context.setOffline(true);
    await expect(page.getByText(OFFLINE_NOTICE)).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText(OFFLINE_NOTICE)).toHaveCount(0);
  });
});

function savedOnDevice(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const opening = indexedDB.open('cleaning-planner');
        opening.onsuccess = (): void => {
          const reading = opening.result
            .transaction('saved-data', 'readonly')
            .objectStore('saved-data')
            .get('api-answers');
          reading.onsuccess = (): void => {
            resolve(typeof reading.result === 'string' ? reading.result : '');
          };
        };
      }),
  );
}

test.describe('closing the app while offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Playwright runs service workers in Chromium only',
  );

  test('a job ticked offline is sent exactly once after the app reopens and the connection returns', async ({
    page,
    context,
  }) => {
    await logInToHome(page);
    const markWipeTheHobDone = page.getByRole('button', { name: 'Mark Wipe the hob as done' });
    await expect(markWipeTheHobDone).toBeVisible();
    await waitForOfflineCopy(page);
    const ticksSent = countTicksSent(page);
    await context.setOffline(true);
    await markWipeTheHobDone.click();
    await expect.poll(() => savedOnDevice(page)).toContain('/jobs/job-hob/completions');

    await page.reload();
    await expect(page.getByText(OFFLINE_NOTICE)).toBeVisible();
    expect(ticksSent()).toBe(0);

    await context.setOffline(false);
    await expect.poll(ticksSent).toBe(1);
    await expect(
      page.getByRole('region', { name: 'Done today' }).getByText('Wipe the hob'),
    ).toBeVisible();
    expect(ticksSent()).toBe(1);
  });
});
