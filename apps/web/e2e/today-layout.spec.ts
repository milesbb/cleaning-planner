import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { logInToHome } from './support/fake-home';
import { DAY_MS } from './support/fake-home-state';
import { E2E_ENVIRONMENT } from './support/test-environment';

const WINDOW_HEIGHT = 800;
const WEEK_DAYS = 7;

const LAPTOP_WIDTHS = [
  { windowWidth: 1024, sideWidth: 320 },
  { windowWidth: 1440, sideWidth: 384 },
] as const;

interface Box {
  x: number;
  width: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('Element is not visible');
  return box;
}

function daysAskedFor(url: string): number {
  const query = new URL(url).searchParams;
  const from = Date.parse(query.get('from') ?? '');
  const to = Date.parse(query.get('to') ?? '');
  return Math.round((to - from) / DAY_MS) + 1;
}

// Refuses the week's agenda request while Today's own agenda still answers.
// Playwright tries the newest route first, so call it after logging in.
async function refuseTheWeek(page: Page): Promise<void> {
  await page.route(
    `${E2E_ENVIRONMENT.NEXT_PUBLIC_API_URL}/v1/households/home-1/agenda*`,
    async (route) => {
      const isWeek =
        route.request().method() === 'GET' && daysAskedFor(route.request().url()) === WEEK_DAYS;
      if (!isWeek) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 400,
        headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
        body: JSON.stringify({ error: { code: 'badRequest', message: 'Ask for fewer days' } }),
      });
    },
  );
}

async function openTodayOnALaptop(page: Page, windowWidth = 1280): Promise<Locator> {
  await page.setViewportSize({ width: windowWidth, height: WINDOW_HEIGHT });
  await logInToHome(page);
  return page.getByRole('region', { name: 'This week' });
}

test.describe('Today beside the week', () => {
  for (const { windowWidth, sideWidth } of LAPTOP_WIDTHS) {
    test(`puts the week beside today's jobs at ${String(windowWidth)}px`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'laptops only');
      const week = await openTodayOnALaptop(page, windowWidth);
      await expect(week.getByRole('list', { name: 'Days' }).getByRole('listitem')).toHaveCount(7);
      const jobs = await boxOf(page.getByRole('region', { name: 'Late' }));
      const side = await boxOf(week.locator(':scope > *').first());
      expect(side.x).toBeGreaterThan(jobs.x + jobs.width);
      expect(Math.round(side.width)).toBe(sideWidth);
    });
  }

  test('opens the whole week from the strip', async ({ page, isMobile }) => {
    test.skip(isMobile, 'laptops only');
    const week = await openTodayOnALaptop(page);
    await week.getByRole('link', { name: 'See the week' }).click();
    await expect(page.getByRole('heading', { name: 'This week', level: 1 })).toBeVisible();
  });

  test("counts a job ticked on Today in the week's progress", async ({ page, isMobile }) => {
    test.skip(isMobile, 'laptops only');
    const week = await openTodayOnALaptop(page);
    const progress = week.getByText(/^\d+ of \d+ done$/);
    await expect(progress).toBeVisible();
    const before = await progress.textContent();
    await page.getByRole('button', { name: 'Mark Wipe the hob as done' }).click();
    await expect(progress).not.toHaveText(before ?? '');
  });

  test('says when the week cannot be loaded and keeps Today working', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'laptops only');
    await page.setViewportSize({ width: 1023, height: WINDOW_HEIGHT });
    await logInToHome(page);
    await refuseTheWeek(page);
    await page.setViewportSize({ width: 1280, height: WINDOW_HEIGHT });
    const week = page.getByRole('region', { name: 'This week' });
    await expect(week.getByRole('alert')).toHaveText('Ask for fewer days');
    await expect(week.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Late' })).toContainText('Clean the oven');
  });

  test('leaves the week out below laptop width', async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize({ width: 1023, height: WINDOW_HEIGHT });
    await logInToHome(page);
    await expect(page.getByRole('region', { name: 'Late' })).toContainText('Clean the oven');
    await expect(page.getByRole('region', { name: 'This week' })).toHaveCount(0);
  });
});

test.describe('This week beside the hint', () => {
  test('keeps the days in the main column with the hint beside them', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'laptops only');
    await page.setViewportSize({ width: 1024, height: WINDOW_HEIGHT });
    await logInToHome(page);
    await page.goto('/week');
    const days = await boxOf(page.getByRole('list', { name: 'Days' }));
    const details = page.getByRole('region', { name: 'Job details' });
    const hint = await boxOf(details.locator(':scope > *').first());
    await expect(details).toContainText('Choose a job');
    expect(hint.x).toBeGreaterThan(days.x + days.width);
    expect(Math.round(hint.width)).toBe(320);
  });

  test('leaves the hint out below laptop width', async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize({ width: 1023, height: WINDOW_HEIGHT });
    await logInToHome(page);
    await page.goto('/week');
    await expect(page.getByRole('list', { name: 'Days' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Job details' })).toHaveCount(0);
  });
});
