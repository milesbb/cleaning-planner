import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { openPage } from './support/fake-backend';

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };
const LAPTOP = { width: 1024, height: 800 };
const DESKTOP = { width: 1440, height: 900 };
const WELCOME_FRAME_WIDTH = 1024;
const ACTIONS_GAP = 32;
const PHONE_BOTTOM_PADDING = 28;
const ROUNDING_ALLOWANCE = 2;
const CENTRING_ALLOWANCE = 40;

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

interface WelcomeBoxes {
  main: Box;
  art: Box;
  heading: Box;
  line: Box;
  createAccount: Box;
  logIn: Box;
}

async function welcomeBoxesAt(
  page: Page,
  size: { width: number; height: number },
): Promise<WelcomeBoxes> {
  await page.setViewportSize(size);
  await openPage(page, '/welcome');
  const main = page.getByRole('main');
  return {
    main: await boxOf(main),
    art: await boxOf(main.locator('div[aria-hidden="true"]').first()),
    heading: await boxOf(main.getByRole('heading', { level: 1 })),
    line: await boxOf(main.getByText('One shared plan for everyone')),
    createAccount: await boxOf(main.getByRole('link', { name: 'Create an account' })),
    logIn: await boxOf(main.getByRole('link', { name: 'Log in' })),
  };
}

function bottomOf(box: Box): number {
  return box.y + box.height;
}

function verticalCentreOf(box: Box): number {
  return box.y + box.height / 2;
}

test.describe('Welcome at every size', () => {
  test('stacks the art above the words, with the buttons at the bottom, on a phone', async ({
    page,
  }) => {
    const welcome = await welcomeBoxesAt(page, PHONE);
    expect(welcome.heading.y).toBeGreaterThan(bottomOf(welcome.art));
    expect(Math.round(welcome.heading.x)).toBe(Math.round(welcome.art.x));
    expect(bottomOf(welcome.logIn)).toBeGreaterThanOrEqual(
      PHONE.height - PHONE_BOTTOM_PADDING - ROUNDING_ALLOWANCE,
    );
  });

  test('puts the buttons just under the words on a tablet', async ({ page }) => {
    const welcome = await welcomeBoxesAt(page, TABLET);
    expect(welcome.heading.y).toBeGreaterThan(bottomOf(welcome.art));
    expect(welcome.createAccount.y - bottomOf(welcome.line)).toBeCloseTo(ACTIONS_GAP, 0);
  });

  for (const size of [LAPTOP, DESKTOP]) {
    test(`puts the art beside the words, centred in the window, at ${String(size.width)}px`, async ({
      page,
    }) => {
      const welcome = await welcomeBoxesAt(page, size);
      expect(welcome.heading.x).toBeGreaterThan(welcome.art.x + welcome.art.width);
      expect(welcome.createAccount.x).toBeGreaterThan(welcome.art.x + welcome.art.width);
      expect(welcome.createAccount.y).toBeGreaterThan(bottomOf(welcome.line));
      expect(welcome.main.width).toBeLessThanOrEqual(WELCOME_FRAME_WIDTH);
      expect(Math.abs(verticalCentreOf(welcome.art) - size.height / 2)).toBeLessThan(
        CENTRING_ALLOWANCE,
      );
    });
  }
});
