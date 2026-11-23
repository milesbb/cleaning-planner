import type { Page } from '@playwright/test';

// Resolves once the service worker controls the page, so the site is saved for offline use.
export async function waitForOfflineCopy(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller !== null) return;
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
    });
  });
}
