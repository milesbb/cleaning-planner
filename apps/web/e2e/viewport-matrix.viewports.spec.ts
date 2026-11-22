import { expect, test } from '@playwright/test';
import {
  accessibilityViolations,
  horizontalOverflowPixels,
  smallTouchTargets,
  VIEWPORTS,
} from './support/viewport-matrix';

const goodPage = `<!doctype html><html lang="en"><head><title>Good</title>
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><main><h1>Good page</h1>
<p>Read the <a href="/help">help page</a> for more.</p>
<button style="min-width:44px;min-height:44px">Done</button>
<label>Name <input style="height:44px" /></label></main></body></html>`;

test.describe('viewport matrix checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
  });

  test('passes a well-built page', async ({ page }) => {
    await page.setContent(goodPage);
    expect(await horizontalOverflowPixels(page)).toBeLessThanOrEqual(0);
    expect(await smallTouchTargets(page)).toEqual([]);
    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test('catches content wider than the screen', async ({ page }) => {
    await page.setContent(goodPage.replace('<h1>', '<div style="width:600px">wide</div><h1>'));
    expect(await horizontalOverflowPixels(page)).toBeGreaterThan(0);
  });

  test('catches a button smaller than 44px', async ({ page }) => {
    await page.setContent(
      goodPage.replace('min-width:44px;min-height:44px', 'width:30px;height:30px;padding:0'),
    );
    expect(await smallTouchTargets(page)).toEqual([
      expect.stringContaining('<button> "Done" is 30×30px'),
    ]);
  });

  test('ignores links inside a sentence but checks standalone links', async ({ page }) => {
    await page.setContent(
      goodPage.replace(
        '<button',
        '<a href="/x" style="display:inline-block;height:20px">Tiny</a><button',
      ),
    );
    expect(await smallTouchTargets(page)).toEqual([expect.stringContaining('<a> "Tiny"')]);
  });

  test('catches an input with no label', async ({ page }) => {
    await page.setContent(
      goodPage.replace(
        '<label>Name <input style="height:44px" /></label>',
        '<input style="height:44px" />',
      ),
    );
    expect((await accessibilityViolations(page)).join('\n')).toContain('label');
  });
});

test('covers phones, tablets, laptops and desktops in both orientations', () => {
  const widths = VIEWPORTS.map((viewport) => viewport.width);
  expect(Math.min(...widths)).toBe(320);
  expect(Math.max(...widths)).toBe(1920);
  expect(
    VIEWPORTS.some((viewport) => viewport.width > viewport.height && viewport.height < 500),
  ).toBe(true);
});
