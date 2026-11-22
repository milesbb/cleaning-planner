import { expect, test } from '@playwright/test';
import { accessibilityViolations } from './support/viewport-matrix';

const COMPONENTS_PATH = '/dev/components/';

test.describe('components page', () => {
  test('shows every section with no accessibility violations', async ({ page }) => {
    await page.goto(COMPONENTS_PATH);
    await expect(page.getByRole('heading', { level: 1, name: 'Components' })).toBeVisible();
    for (const section of ['Buttons', 'Form fields', 'Choice controls', 'Job pieces']) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
    }
    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test('marks a job done and undoes it', async ({ page }) => {
    await page.goto(COMPONENTS_PATH);
    await page.getByRole('button', { name: 'Mark Vacuum the living room as done' }).click();
    await expect(page.getByText('Done by you at 08:40 · next 29 Nov')).toBeVisible();
    await page.getByRole('button', { name: 'Undo Vacuum the living room' }).click();
    await expect(
      page.getByRole('button', { name: 'Mark Vacuum the living room as done' }),
    ).toBeVisible();
  });

  test('fills the code boxes from a pasted code', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(COMPONENTS_PATH);
    await page.evaluate(async () => {
      await navigator.clipboard.writeText('Your code is 482 019');
    });
    await page.getByRole('textbox', { name: 'Digit 1 of 6' }).first().click();
    await page.keyboard.press('ControlOrMeta+V');
    await expect(page.getByText('Got 482019.')).toBeVisible();
  });

  test('keeps a sheet open until it is dismissed, then returns focus', async ({ page }) => {
    await page.goto(COMPONENTS_PATH);
    const opener = page.getByRole('button', { name: 'Open a sheet' });
    await opener.click();
    const sheet = page.getByRole('dialog', { name: 'Snooze this job?' });
    await expect(sheet).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();
  });
});
