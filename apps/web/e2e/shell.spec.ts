import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const SHELL_PATH = '/dev/shell/';
const RAIL_MAXIMUM_WIDTH = 300;

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

function viewportOf(page: Page): { width: number; height: number } {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('No viewport size');
  return viewport;
}

test.describe('app shell', () => {
  test('puts the tab bar along the bottom on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones only');
    await page.goto(SHELL_PATH);
    const navigation = await boxOf(page.getByRole('navigation', { name: 'Main' }));
    const viewport = viewportOf(page);
    expect(Math.round(navigation.y + navigation.height)).toBe(viewport.height);
    expect(Math.round(navigation.width)).toBe(viewport.width);
  });

  test('turns the tab bar into a rail down the left on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await page.goto(SHELL_PATH);
    const navigation = await boxOf(page.getByRole('navigation', { name: 'Main' }));
    expect(navigation.x).toBe(0);
    expect(Math.round(navigation.height)).toBe(viewportOf(page).height);
    expect(navigation.width).toBeLessThan(RAIL_MAXIMUM_WIDTH);
  });

  test('marks the current tab', async ({ page }) => {
    await page.goto(SHELL_PATH);
    await expect(page.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: 'Week' })).not.toHaveAttribute('aria-current');
  });

  test('never hides the last job behind the tab bar', async ({ page }) => {
    await page.goto(SHELL_PATH);
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    const lastJob = await boxOf(page.getByRole('button', { name: /^Mark .* as done$/ }).last());
    const navigation = await boxOf(page.getByRole('navigation', { name: 'Main' }));
    const isBottomBar = navigation.width === viewportOf(page).width;
    if (isBottomBar) expect(lastJob.y + lastJob.height).toBeLessThanOrEqual(navigation.y);
  });

  test('switches home from the sheet and closes it with Escape', async ({ page }) => {
    await page.goto(SHELL_PATH);
    const switcher = page.getByRole('button', { name: 'Our flat, switch home' });
    await switcher.click();
    await expect(page.getByRole('dialog', { name: 'Your homes' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(switcher).toBeFocused();
    await switcher.click();
    await page.getByRole('button', { name: "Mum's house" }).click();
    await expect(page.getByRole('button', { name: "Mum's house, switch home" })).toBeVisible();
  });
});
