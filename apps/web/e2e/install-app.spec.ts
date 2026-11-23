import { expect, test } from '@playwright/test';
import { logInToHome } from './support/fake-home';

const IPHONE_PROJECT = 'iphone';

test.describe('Use it like an app', () => {
  test('shows how to install from Settings', async ({ page }, testInfo) => {
    await logInToHome(page);
    await page.goto('/settings');
    const section = page.getByRole('region', { name: 'Use it like an app' });
    if (testInfo.project.name === IPHONE_PROJECT) {
      await expect(section.getByRole('listitem')).toHaveCount(3);
      await expect(section).toContainText('Add to Home Screen');
    } else {
      await expect(section).toContainText('your browser’s menu');
    }
  });

  test('installs with one tap when the browser offers it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === IPHONE_PROJECT, 'Safari never offers to install');
    await logInToHome(page);
    await page.evaluate(() => {
      const offer = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: (): Promise<void> => {
          document.body.dataset.installPrompted = 'yes';
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(offer);
    });
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Settings' })
      .click();
    await page
      .getByRole('region', { name: 'Use it like an app' })
      .getByRole('button', { name: 'Install' })
      .click();
    await expect(page.locator('body')).toHaveAttribute('data-install-prompted', 'yes');
  });

  test('says nothing once it runs as an installed app', async ({ page }) => {
    await page.addInitScript(() => {
      const browserMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query: string): MediaQueryList =>
        browserMatchMedia(query === '(display-mode: standalone)' ? '(min-width: 0px)' : query);
    });
    await logInToHome(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Use it like an app' })).toHaveCount(0);
  });
});
