import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { logInToHome } from './support/fake-home';

const ADD_JOB_PATH = '/room/add?id=room-kitchen';
const LAPTOP = { width: 1024, height: 800 };
const SEARCH_MAXIMUM_WIDTH = 512;

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

async function firstTwoLibraryJobs(page: Page): Promise<[Box, Box]> {
  const jobs = page.getByRole('list', { name: 'Jobs from the library' }).getByRole('listitem');
  await expect(jobs.nth(1)).toBeVisible();
  return [await boxOf(jobs.nth(0)), await boxOf(jobs.nth(1))];
}

test.describe('Add a job at every size', () => {
  test('puts the library in two columns on a laptop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await page.setViewportSize(LAPTOP);
    await logInToHome(page);
    await page.goto(ADD_JOB_PATH);
    const [first, second] = await firstTwoLibraryJobs(page);
    expect(Math.round(second.y)).toBe(Math.round(first.y));
    expect(second.x).toBeGreaterThan(first.x + first.width);
    const search = await boxOf(page.getByRole('searchbox', { name: 'Search jobs' }));
    expect(search.width).toBeLessThanOrEqual(SEARCH_MAXIMUM_WIDTH);
  });

  test('keeps the library in one column on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones only');
    await logInToHome(page);
    await page.goto(ADD_JOB_PATH);
    const [first, second] = await firstTwoLibraryJobs(page);
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    expect(Math.round(second.x)).toBe(Math.round(first.x));
  });
});
