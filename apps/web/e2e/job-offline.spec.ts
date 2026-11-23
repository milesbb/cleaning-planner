import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { logInToHome } from './support/fake-home';
import { waitForOfflineCopy } from './support/service-worker';

function countSnoozesSent(page: Page): () => number {
  let snoozesSent = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/snooze')) snoozesSent += 1;
  });
  return () => snoozesSent;
}

test.describe('Job detail offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Playwright runs service workers in Chromium only',
  );

  test('a snooze made offline reaches the API exactly once when back online', async ({
    page,
    context,
  }) => {
    await logInToHome(page);
    await page.goto('/job?id=job-hob');
    const snooze = page.getByRole('button', { name: 'Snooze' });
    await expect(snooze).toBeVisible();
    await waitForOfflineCopy(page);
    const snoozesSent = countSnoozesSent(page);

    await context.setOffline(true);
    await snooze.click();
    await page
      .getByRole('dialog', { name: 'Snooze' })
      .getByRole('button', { name: /In 3 days/ })
      .click();
    await expect(
      page.getByText('You’re offline. This is what was saved on this device.'),
    ).toBeVisible();
    expect(snoozesSent()).toBe(0);

    await context.setOffline(false);
    await expect(page.getByRole('status')).toContainText('Snoozed until');
    expect(snoozesSent()).toBe(1);
  });
});
