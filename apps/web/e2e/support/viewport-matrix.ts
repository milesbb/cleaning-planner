import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

export interface NamedViewport {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORTS: readonly NamedViewport[] = [
  { name: 'small phone 320', width: 320, height: 640 },
  { name: 'phone 375', width: 375, height: 667 },
  { name: 'iPhone 390', width: 390, height: 844 },
  { name: 'Android 412', width: 412, height: 915 },
  { name: 'phone landscape 844', width: 844, height: 390 },
  { name: 'tablet 768', width: 768, height: 1024 },
  { name: 'tablet landscape 1024', width: 1024, height: 768 },
  { name: 'laptop 1280', width: 1280, height: 800 },
  { name: 'laptop 1440', width: 1440, height: 900 },
  { name: 'desktop 1920', width: 1920, height: 1080 },
];

const MINIMUM_TOUCH_TARGET_PIXELS = 44;

const INTERACTIVE_SELECTOR =
  'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="switch"], [role="radio"], [role="checkbox"], [role="tab"]';

export async function horizontalOverflowPixels(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

export async function smallTouchTargets(
  page: Page,
  minimumPixels: number = MINIMUM_TOUCH_TARGET_PIXELS,
): Promise<string[]> {
  return page.locator(INTERACTIVE_SELECTOR).evaluateAll(
    (elements, minimum) =>
      elements
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const isInlineTextLink = element.tagName === 'A' && style.display === 'inline';
          const isVisible = style.visibility !== 'hidden' && style.display !== 'none';
          return isVisible && !isInlineTextLink;
        })
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && (box.width < minimum || box.height < minimum);
        })
        .map((element) => {
          const box = element.getBoundingClientRect();
          const label = (element.getAttribute('aria-label') ?? element.textContent).trim();
          return `<${element.tagName.toLowerCase()}> "${label.slice(0, 40)}" is ${String(Math.round(box.width))}×${String(Math.round(box.height))}px`;
        }),
    minimumPixels,
  );
}

export async function accessibilityViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map(
    (violation) => `${violation.id}: ${violation.help} (${String(violation.nodes.length)} nodes)`,
  );
}

export function testAtEveryViewport(screenName: string, path: string): void {
  test.describe(`${screenName} at every screen size`, () => {
    for (const viewport of VIEWPORTS) {
      test(viewport.name, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(path);
        await testInfo.attach(`${screenName} – ${viewport.name}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
        expect(await horizontalOverflowPixels(page), 'scrolls sideways').toBeLessThanOrEqual(0);
        expect(await smallTouchTargets(page), 'touch targets under 44px').toEqual([]);
        expect(await accessibilityViolations(page), 'axe violations').toEqual([]);
      });
    }
  });
}
