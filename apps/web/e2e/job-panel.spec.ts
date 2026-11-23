import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { logInToHome } from './support/fake-home';

const LAPTOP = { width: 1280, height: 800 };
const OVEN = { name: 'Clean the oven', level: 2 } as const;

function ovenRow(page: Page): ReturnType<Page['getByRole']> {
  return page.getByRole('region', { name: 'Late' }).getByRole('link', { name: /Clean the oven/ });
}

async function openTodayOnALaptop(page: Page): Promise<void> {
  await page.setViewportSize(LAPTOP);
  await logInToHome(page);
}

test.describe('Job detail beside the list', () => {
  test('opens a job beside Today and goes back to the list', async ({ page, isMobile }) => {
    test.skip(isMobile, 'laptops only');
    await openTodayOnALaptop(page);
    await ovenRow(page).click();
    await expect(page).toHaveURL(/\/today\/?\?job=job-oven$/);
    const details = page.getByRole('region', { name: 'Job details' });
    await expect(details.getByRole('heading', OVEN)).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/today\/?$/);
    await expect(details).toHaveCount(0);
    await expect(ovenRow(page)).toBeFocused();
  });

  test('closes with Close or Escape', async ({ page, isMobile }) => {
    test.skip(isMobile, 'laptops only');
    await openTodayOnALaptop(page);
    await ovenRow(page).click();
    const details = page.getByRole('region', { name: 'Job details' });
    await details.getByRole('button', { name: 'Close' }).click();
    await expect(details).toHaveCount(0);
    await expect(ovenRow(page)).toBeFocused();
    await ovenRow(page).click();
    await expect(details.getByRole('heading', OVEN)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
  });

  test('marks a job done from the panel and updates the list beside it', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'laptops only');
    await openTodayOnALaptop(page);
    await ovenRow(page).click();
    const details = page.getByRole('region', { name: 'Job details' });
    await details.getByRole('button', { name: 'Mark as done' }).click();
    await expect(
      page.getByRole('region', { name: 'Done today' }).getByText('Clean the oven'),
    ).toBeVisible();
    await expect(details.getByRole('heading', OVEN)).toBeVisible();
  });

  test('leaves a Ctrl-click to open the job in a new tab', async ({ page, isMobile }) => {
    test.skip(isMobile, 'laptops only');
    await openTodayOnALaptop(page);
    const newTab = page.context().waitForEvent('page');
    await ovenRow(page).click({ modifiers: ['ControlOrMeta'] });
    await (await newTab).close();
    await expect(page).toHaveURL(/\/today\/?$/);
    await expect(page.getByRole('region', { name: 'Job details' })).toHaveCount(0);
  });

  test("shows the job's own page on a phone", async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize({ width: 390, height: 844 });
    await logInToHome(page);
    await ovenRow(page).click();
    await expect(page).toHaveURL(/\/job\/?\?id=job-oven$/);
    await expect(page.getByRole('heading', { name: 'Clean the oven', level: 1 })).toBeVisible();
  });

  test('turns a shared panel address into the job page on a phone', async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize({ width: 390, height: 844 });
    await logInToHome(page);
    await page.goto('/today?job=job-oven');
    await expect(page).toHaveURL(/\/job\/?\?id=job-oven$/);
    await expect(page.getByRole('heading', { name: 'Clean the oven', level: 1 })).toBeVisible();
  });
});
