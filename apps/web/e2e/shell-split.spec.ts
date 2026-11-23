import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

const SPLIT_PATH = '/dev/shell/split/';
const COMPONENTS_PATH = '/dev/components/';
const WINDOW_HEIGHT = 800;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('Element is not visible');
  return box;
}

const LAPTOP_WIDTHS = [
  { windowWidth: 1024, sideWidth: 320 },
  { windowWidth: 1440, sideWidth: 384 },
] as const;

test.describe('two-column frame', () => {
  for (const { windowWidth, sideWidth } of LAPTOP_WIDTHS) {
    test(`puts the side column beside the main column at ${String(windowWidth)}px`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'desktop only');
      await page.setViewportSize({ width: windowWidth, height: WINDOW_HEIGHT });
      await page.goto(SPLIT_PATH);
      const jobs = await boxOf(page.getByRole('region', { name: 'Jobs' }));
      const sideContent = page.getByRole('region', { name: 'Job details' }).locator(':scope > *');
      const side = await boxOf(sideContent.first());
      expect(side.x).toBeGreaterThan(jobs.x + jobs.width);
      expect(Math.round(side.width)).toBe(sideWidth);
      await expect(sideContent.first()).toContainText('Choose a job');
    });
  }

  test('leaves hidden side content out below laptop width', async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize({ width: 1023, height: WINDOW_HEIGHT });
    await page.goto(SPLIT_PATH);
    await expect(page.getByRole('region', { name: 'Jobs' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Job details' })).toHaveCount(0);
  });

  test('shows the side column when the window widens to a laptop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await page.setViewportSize({ width: 800, height: WINDOW_HEIGHT });
    await page.goto(SPLIT_PATH);
    await expect(page.getByRole('region', { name: 'Job details' })).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: WINDOW_HEIGHT });
    await expect(page.getByRole('region', { name: 'Job details' })).toBeVisible();
  });
});

test.describe('wide sheets', () => {
  test('are 40rem wide on a laptop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await page.setViewportSize({ width: 1024, height: WINDOW_HEIGHT });
    await page.goto(COMPONENTS_PATH);
    await page.getByRole('button', { name: 'Open a wide sheet' }).click();
    const sheet = await boxOf(page.getByRole('dialog', { name: 'Add a room' }));
    expect(Math.round(sheet.width)).toBe(640);
  });

  test('fit inside a phone', async ({ page }) => {
    await page.goto(COMPONENTS_PATH);
    await page.getByRole('button', { name: 'Open a wide sheet' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a room' });
    const sheet = await boxOf(dialog);
    const windowWidth = page.viewportSize()?.width ?? 0;
    expect(sheet.x).toBeGreaterThanOrEqual(0);
    expect(sheet.x + sheet.width).toBeLessThanOrEqual(windowWidth);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Open a wide sheet' })).toBeFocused();
  });
});
