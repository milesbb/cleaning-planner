import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { fakeApi, holdApi } from './support/fake-backend';
import { logInToHome } from './support/fake-home';
import { calendarDay, HOME_PATH } from './support/fake-home-state';

const HOB_SNOOZE = `${HOME_PATH}/jobs/job-hob/snooze`;
const HOB_COMPLETIONS = `${HOME_PATH}/jobs/job-hob/completions`;

function region(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true });
}

async function chooseFromMore(page: Page, jobName: string, choice: string): Promise<void> {
  await page.getByRole('button', { name: `More for ${jobName}` }).click();
  await page.getByRole('dialog', { name: jobName }).getByRole('button', { name: choice }).click();
}

// Playwright can't drag a finger in WebKit, so the swipe is the pointer events
// a finger makes.
async function swipeLeft(row: Locator): Promise<void> {
  const box = await row.boundingBox();
  if (box === null) throw new Error('The row is not on screen');
  const rowMiddle = box.y + box.height / 2;
  const touch = (clientX: number): object => ({
    pointerType: 'touch',
    isPrimary: true,
    clientX,
    clientY: rowMiddle,
  });
  const start = box.x + box.width - 20;
  await row.dispatchEvent('pointerdown', touch(start));
  for (const distance of [20, 80, 140, 180]) {
    await row.dispatchEvent('pointermove', touch(start - distance));
  }
  await row.dispatchEvent('pointerup', touch(start - 180));
}

test.describe('Today: snooze and skip', () => {
  test('snoozes a job to tomorrow from More', async ({ page }) => {
    await logInToHome(page);
    const snoozes = await holdApi(page, HOB_SNOOZE, 'POST');
    await chooseFromMore(page, 'Wipe the hob', 'Snooze a day');
    await expect(region(page, 'Tomorrow').getByText('Wipe the hob')).toBeVisible();
    await expect(region(page, 'Today').getByText('Wipe the hob')).toHaveCount(0);
    expect(snoozes[0]?.postDataJSON()).toMatchObject({ until: calendarDay(1) });
  });

  test('skips a job from More without calling it done', async ({ page }) => {
    await logInToHome(page);
    const skips = await holdApi(page, HOB_COMPLETIONS, 'POST');
    await chooseFromMore(page, 'Wipe the hob', 'Skip');
    await expect(region(page, 'Today').getByText('Wipe the hob')).toHaveCount(0);
    await expect(page.getByText('Wipe the hob')).toHaveCount(0);
    expect(skips[0]?.postDataJSON()).toMatchObject({
      outcome: 'skipped',
      completedOn: calendarDay(0),
    });
  });

  test('puts a job back and says so when the snooze is refused', async ({ page }) => {
    await logInToHome(page);
    await fakeApi(
      page,
      HOB_SNOOZE,
      { status: 400, body: { error: { code: 'badRequest', message: 'Snooze to a later day' } } },
      { method: 'POST' },
    );
    await chooseFromMore(page, 'Wipe the hob', 'Snooze a day');
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Snooze to a later day');
    await expect(region(page, 'Today').getByText('Wipe the hob')).toBeVisible();
  });

  test('skips a job with a swipe on a phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch only');
    await logInToHome(page);
    const skips = await holdApi(page, HOB_COMPLETIONS, 'POST');
    await swipeLeft(page.getByRole('link', { name: /Wipe the hob/ }));
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(region(page, 'Today').getByText('Wipe the hob')).toHaveCount(0);
    expect(skips).toHaveLength(1);
  });

  test('springs back from a short swipe, leaving the job where it was', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'touch only');
    await logInToHome(page);
    const hob = page.getByRole('link', { name: /Wipe the hob/ });
    const box = await hob.boundingBox();
    const touch = (clientX: number): object => ({
      pointerType: 'touch',
      clientX,
      clientY: (box?.y ?? 0) + 10,
    });
    await hob.dispatchEvent('pointerdown', touch(300));
    await hob.dispatchEvent('pointermove', touch(270));
    await hob.dispatchEvent('pointerup', touch(270));
    await expect(page.getByRole('button', { name: 'Skip', exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/\/today\/?$/);
  });
});
