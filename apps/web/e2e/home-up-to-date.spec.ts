import { expect, test } from '@playwright/test';
import { logInToHome } from './support/fake-home';

test.describe('Home: how up to date each room is', () => {
  test('counts the jobs that are not late, and follows a tick', async ({ page }) => {
    await logInToHome(page);
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Home' })
      .click();
    const kitchen = page
      .getByRole('list', { name: 'Rooms' })
      .getByRole('link', { name: /Kitchen/ });
    await expect(kitchen).toHaveAccessibleName(/1 of 2 up to date/);

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Today' })
      .click();
    await page.getByRole('button', { name: 'Mark Clean the oven as done' }).click();
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Home' })
      .click();
    await expect(kitchen).toHaveAccessibleName(/2 of 2 up to date/);
  });

  test('says nothing about a room with no jobs yet', async ({ page }) => {
    await logInToHome(page);
    await page.goto('/home');
    await page.getByRole('button', { name: 'Add a room' }).click();
    await page
      .getByRole('dialog', { name: 'Add a room' })
      .getByRole('button', { name: 'Add room' })
      .click();
    const bathroom = page
      .getByRole('list', { name: 'Rooms' })
      .getByRole('link', { name: /Bathroom/ });
    await expect(bathroom).toBeVisible();
    await expect(bathroom).not.toHaveAccessibleName(/up to date/);
  });
});
