import { expect, test } from '@playwright/test';
import { logInToHome } from './support/fake-home';

test.describe('Help', () => {
  test('opens from the main menu and explains how the app works', async ({ page }) => {
    await logInToHome(page);
    const menu = page.getByRole('navigation', { name: 'Main' });
    await menu.getByRole('link', { name: 'Help' }).click();
    await expect(page.getByRole('heading', { name: 'Help', level: 1 })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Help' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Not today?', level: 2 })).toBeVisible();
    await expect(page.getByText(/snooze it to a later day/)).toBeVisible();
  });

  test('takes you back to your jobs from the menu', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/help');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Today' })
      .click();
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  });
});
