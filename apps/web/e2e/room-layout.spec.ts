import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openPage } from './support/fake-backend';
import { boxOf, countInFirstRow, expectBeside } from './support/element-box';
import { logInToHome } from './support/fake-home';

const KITCHEN_PATH = '/room?id=room-kitchen';
const WINDOW_HEIGHT = 800;
const WIDE_SHEET_WIDTH = 640;

async function openKitchenAt(page: Page, windowWidth: number): Promise<void> {
  await page.setViewportSize({ width: windowWidth, height: WINDOW_HEIGHT });
  await logInToHome(page);
  await openPage(page, KITCHEN_PATH);
  await expect(page.getByRole('heading', { name: 'Kitchen', level: 1 })).toBeVisible();
}

const SIDE_WIDTHS = [
  { windowWidth: 1024, sideWidth: 320 },
  { windowWidth: 1440, sideWidth: 384 },
] as const;

test.describe('Room at tablet and laptop sizes', () => {
  for (const { windowWidth, sideWidth } of SIDE_WIDTHS) {
    test(`puts the job hint beside the jobs at ${String(windowWidth)}px`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'desktop only');
      await openKitchenAt(page, windowWidth);
      const jobs = await boxOf(page.getByRole('list', { name: 'Jobs in Kitchen' }));
      const hint = page.getByRole('region', { name: 'Job details' }).locator(':scope > *');
      await expect(hint).toContainText('Choose a job');
      const side = await boxOf(hint);
      expectBeside(jobs, side);
      expect(Math.round(side.width)).toBe(sideWidth);
    });
  }

  test('leaves the hint out below laptop width', async ({ page, isMobile }) => {
    if (isMobile) {
      await logInToHome(page);
      await openPage(page, KITCHEN_PATH);
    } else {
      await openKitchenAt(page, 1023);
    }
    await expect(page.getByRole('list', { name: 'Jobs in Kitchen' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Job details' })).toHaveCount(0);
  });

  test('says a missing room is missing, with no hint beside it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await page.setViewportSize({ width: 1280, height: WINDOW_HEIGHT });
    await logInToHome(page);
    await openPage(page, '/room?id=room-gone');
    await expect(page.getByRole('alert')).toContainText('That room isn’t in this home any more');
    await expect(page.getByRole('region', { name: 'Job details' })).toHaveCount(0);
  });

  test('opens Edit room wide, with the appliances in two columns', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await openKitchenAt(page, 1024);
    await page.getByRole('button', { name: 'Edit room' }).click();
    const sheet = page.getByRole('dialog', { name: 'Edit room' });
    expect(Math.round((await boxOf(sheet)).width)).toBe(WIDE_SHEET_WIDTH);
    expect(await countInFirstRow(sheet.getByRole('checkbox'))).toBe(2);
  });
});
