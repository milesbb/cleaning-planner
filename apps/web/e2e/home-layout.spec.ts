import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { openPage } from './support/fake-backend';
import { boxOf, countInFirstRow, expectBelow, expectBeside } from './support/element-box';
import { logInToHome } from './support/fake-home';

const WINDOW_HEIGHT = 800;
const WIDE_SHEET_WIDTH = 640;

async function openHomeAt(page: Page, windowWidth: number): Promise<void> {
  await page.setViewportSize({ width: windowWidth, height: WINDOW_HEIGHT });
  await logInToHome(page);
  await openPage(page, '/home');
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
}

async function addABathroom(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add a room' }).click();
  await page
    .getByRole('dialog', { name: 'Add a room' })
    .getByRole('button', { name: 'Add room' })
    .click();
  await expect(page.getByRole('link', { name: /Bathroom/ })).toBeVisible();
}

function roomTiles(page: Page): Locator {
  return page.getByRole('list', { name: 'Rooms' }).getByRole('listitem');
}

async function expectRecentlyBelowTheRooms(page: Page): Promise<void> {
  const rooms = await boxOf(page.getByRole('list', { name: 'Rooms' }));
  expectBelow(rooms, await boxOf(page.getByRole('region', { name: 'Recently' })));
}

test.describe('Home at tablet and laptop sizes', () => {
  test('puts Recently beside two tiles per row at 1024px', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await openHomeAt(page, 1024);
    await addABathroom(page);
    const rooms = await boxOf(page.getByRole('list', { name: 'Rooms' }));
    const recently = await boxOf(page.getByRole('region', { name: 'Recently' }));
    expectBeside(rooms, recently);
    expect(Math.round(recently.width)).toBe(320);
    expect(await countInFirstRow(roomTiles(page))).toBe(2);
  });

  test('has three tiles per row beside Recently at 1440px', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await openHomeAt(page, 1440);
    await addABathroom(page);
    const recently = await boxOf(page.getByRole('region', { name: 'Recently' }));
    expect(Math.round(recently.width)).toBe(384);
    expect(await countInFirstRow(roomTiles(page))).toBe(3);
  });

  test('has three tiles per row with Recently below on a tablet', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await openHomeAt(page, 768);
    await addABathroom(page);
    expect(await countInFirstRow(roomTiles(page))).toBe(3);
    await expectRecentlyBelowTheRooms(page);
  });

  test('keeps two tiles per row and Recently below on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones only');
    await logInToHome(page);
    await openPage(page, '/home');
    await addABathroom(page);
    expect(await countInFirstRow(roomTiles(page))).toBe(2);
    await expectRecentlyBelowTheRooms(page);
  });

  test('keeps Recently beside the list while reordering', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await openHomeAt(page, 1280);
    await page.getByRole('button', { name: 'Reorder rooms' }).click();
    await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Recently' })).toBeVisible();
  });

  test('opens Add a room wide, with the room types in three columns', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop only');
    await openHomeAt(page, 1024);
    await page.getByRole('button', { name: 'Add a room' }).click();
    const sheet = page.getByRole('dialog', { name: 'Add a room' });
    expect(Math.round((await boxOf(sheet)).width)).toBe(WIDE_SHEET_WIDTH);
    expect(await countInFirstRow(sheet.getByRole('radio'))).toBe(3);
  });
});
