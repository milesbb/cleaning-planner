import { expect, test } from '@playwright/test';
import { logInToHome } from './support/fake-home';

test.describe('Start or join a home', () => {
  test('lets someone with a home add another, or go back to Today', async ({ page }) => {
    await logInToHome(page);
    await page.getByRole('button', { name: 'Our flat, switch home' }).click();
    await page.getByRole('link', { name: 'Start or join a home' }).click();
    await expect(page.getByRole('heading', { name: 'Add another home', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start a new home' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to Today' }).click();
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  });
});
