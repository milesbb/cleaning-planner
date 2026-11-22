import { expect, test } from '@playwright/test';

test.describe('content security policy', () => {
  test('is set on the page and allows everything the page itself needs', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) violations.push(message.text());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(policy).toContain("script-src 'self' 'sha256-");
    expect(violations).toEqual([]);
  });

  test('blocks a script injected into the page', async ({ page }) => {
    await page.goto('/');
    const injectedScriptRan = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'document.body.dataset.injected = "yes";';
      document.head.append(script);
      return document.body.dataset.injected === 'yes';
    });
    expect(injectedScriptRan).toBe(false);
  });
});
