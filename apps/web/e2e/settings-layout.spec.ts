import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openPage } from './support/fake-backend';
import { boxOf, expectBelow, expectBeside } from './support/element-box';
import { logInToHome } from './support/fake-home';

const TABLET = { width: 768, height: 1024 };
const LAPTOP = { width: 1440, height: 900 };
const FORM_MAXIMUM_WIDTH = 512;

async function openAtTablet(page: Page, path: string, heading: string): Promise<void> {
  await page.setViewportSize(TABLET);
  await logInToHome(page, { isOwner: true });
  await openPage(page, path);
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
}

const FORM_PAGES = [
  { path: '/settings/account/password', heading: 'Change password', field: 'New password' },
  { path: '/settings/account/email', heading: 'Change email', field: 'New email' },
  { path: '/settings/account/delete', heading: 'Delete account', field: 'Your password' },
] as const;

test.describe('Settings at tablet and laptop sizes', () => {
  test('puts You beside the home’s people from 768px', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await openAtTablet(page, '/settings', 'Settings');
    const you = await boxOf(page.getByRole('region', { name: 'You' }));
    const homePeople = await boxOf(page.getByRole('region', { name: 'Our flat' }));
    expectBeside(you, homePeople);
    expect(Math.round(homePeople.y)).toBe(Math.round(you.y));
    expectBelow(homePeople, await boxOf(page.getByRole('button', { name: 'Sign out' })));
  });

  test('keeps Settings in one column on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones only');
    await logInToHome(page);
    await openPage(page, '/settings');
    const you = await boxOf(page.getByRole('region', { name: 'You' }));
    expectBelow(you, await boxOf(page.getByRole('region', { name: 'Our flat' })));
  });

  test('puts the people beside Invite someone and the home’s details', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop only');
    await openAtTablet(page, '/settings/home', 'Our flat');
    const people = await boxOf(page.getByRole('list', { name: 'People' }));
    const invite = await boxOf(page.getByRole('region', { name: 'Invite someone' }));
    const details = await boxOf(page.getByRole('region', { name: 'Home details' }));
    expectBeside(people, invite);
    expectBeside(people, details);
    expectBelow(invite, details);
    expectBelow(details, await boxOf(page.getByRole('button', { name: 'Delete this home' })));
  });

  test('puts your details beside your homes', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await openAtTablet(page, '/settings/account', 'Your account');
    const details = await boxOf(page.getByRole('region', { name: 'Your details' }));
    expectBeside(details, await boxOf(page.getByRole('region', { name: 'Your homes' })));
  });

  for (const { path, heading, field } of FORM_PAGES) {
    test(`keeps ${heading} to a 32rem form on a laptop`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'desktop only');
      await page.setViewportSize(LAPTOP);
      await logInToHome(page);
      await openPage(page, path);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      const input = await boxOf(page.getByLabel(field, { exact: true }));
      expect(input.width).toBeLessThanOrEqual(FORM_MAXIMUM_WIDTH);
    });
  }
});
