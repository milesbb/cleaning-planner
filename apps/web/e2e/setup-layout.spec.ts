import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { openPage } from './support/fake-backend';

const PHONE = { width: 390, height: 844 };
const LAPTOP = { width: 1024, height: 800 };
const CHOICES_WIDTH = 768;
const FORM_WIDTH = 512;
const NARROW_CONTINUE_WIDTH = 320;

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

async function openAt(
  page: Page,
  size: { width: number; height: number },
  path: string,
): Promise<void> {
  await page.setViewportSize(size);
  await openPage(page, path);
}

async function roomSwitchBox(page: Page, room: string): Promise<Box> {
  return boxOf(page.getByRole('switch', { name: room }));
}

test.describe('Setup at every size', () => {
  test('puts the rooms in two columns, with a narrow Continue, on a laptop', async ({ page }) => {
    await openAt(page, LAPTOP, '/setup/rooms');
    const kitchen = await roomSwitchBox(page, 'Kitchen');
    const livingRoom = await roomSwitchBox(page, 'Living room');
    const laundry = await roomSwitchBox(page, 'Laundry');
    expect(livingRoom.x).toBeGreaterThan(kitchen.x + kitchen.width);
    expect(livingRoom.y).toBeGreaterThan(kitchen.y);
    expect(Math.round(laundry.x)).toBe(Math.round(kitchen.x));
    expect((await boxOf(page.getByRole('main'))).width).toBeLessThanOrEqual(CHOICES_WIDTH);
    const continueButton = await boxOf(page.getByRole('button', { name: 'Continue' }));
    expect(continueButton.width).toBeLessThanOrEqual(NARROW_CONTINUE_WIDTH);
  });

  test('keeps the rooms in one column, with a full-width Continue, on a phone', async ({
    page,
  }) => {
    await openAt(page, PHONE, '/setup/rooms');
    const kitchen = await roomSwitchBox(page, 'Kitchen');
    const livingRoom = await roomSwitchBox(page, 'Living room');
    expect(Math.round(livingRoom.x)).toBe(Math.round(kitchen.x));
    expect(livingRoom.y).toBeGreaterThan(kitchen.y);
    const continueButton = await boxOf(page.getByRole('button', { name: 'Continue' }));
    expect(continueButton.width).toBeGreaterThan(NARROW_CONTINUE_WIDTH);
  });

  test('puts the appliance groups in two columns on a laptop', async ({ page }) => {
    await openAt(page, LAPTOP, '/setup/appliances');
    const kitchen = await boxOf(page.getByRole('group', { name: 'Kitchen' }));
    const laundry = await boxOf(page.getByRole('group', { name: 'Laundry' }));
    expect(laundry.x).toBeGreaterThan(kitchen.x + kitchen.width);
    expect(Math.round(laundry.y)).toBe(Math.round(kitchen.y));
  });

  test('keeps the appliance groups in one column on a phone', async ({ page }) => {
    await openAt(page, PHONE, '/setup/appliances');
    const kitchen = await boxOf(page.getByRole('group', { name: 'Kitchen' }));
    const laundry = await boxOf(page.getByRole('group', { name: 'Laundry' }));
    expect(Math.round(laundry.x)).toBe(Math.round(kitchen.x));
    expect(laundry.y).toBeGreaterThan(kitchen.y + kitchen.height);
  });

  test('keeps the short forms to one 32rem column on a laptop', async ({ page }) => {
    for (const path of ['/setup/reminders', '/homes/new']) {
      await openAt(page, LAPTOP, path);
      expect((await boxOf(page.getByRole('main'))).width).toBeLessThanOrEqual(FORM_WIDTH);
    }
  });
});
