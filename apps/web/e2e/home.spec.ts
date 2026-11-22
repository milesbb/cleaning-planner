import { expect, test } from '@playwright/test';
import { APP_NAME } from '../src/lib/app-identity';

test.describe('home page', () => {
  test('shows today with the example task', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Example task' })).toContainText(
      'Next due 1 December 2026',
    );
  });

  test('has no horizontal scroll at any viewport', async ({ page }) => {
    await page.goto('/');
    const horizontalOverflowPixels = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(horizontalOverflowPixels).toBeLessThanOrEqual(0);
  });

  test('returns 404 for an unknown route', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
  });
});

test.describe('installable web app', () => {
  test('links a manifest that opens standalone', async ({ page, request }) => {
    await page.goto('/');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).not.toBeNull();
    const response = await request.get(manifestHref ?? '');
    expect(response.ok()).toBe(true);
    const manifest: unknown = await response.json();
    expect(manifest).toMatchObject({ name: APP_NAME, display: 'standalone' });
  });

  test('serves the iOS home screen icon', async ({ request }) => {
    const response = await request.get('/icons/apple-touch-icon.png');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toBe('image/png');
  });
});
