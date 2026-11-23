import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { logInToHome } from './support/fake-home';

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
