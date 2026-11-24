import type { Page } from '@playwright/test';
import { logInToHome } from './support/fake-home';
import { testAtEveryViewport } from './support/viewport-matrix';

// "You're all set" shows only in the tab that has just created a home.
async function logInJustAfterCreatingAHome(page: Page): Promise<void> {
  await logInToHome(page);
  await page.evaluate(() => {
    window.sessionStorage.setItem('cleaning-planner.just-created-home', 'yes');
  });
}

testAtEveryViewport('Setup: rooms', '/setup/rooms', { prepare: logInToHome });
testAtEveryViewport('Setup: appliances', '/setup/appliances', { prepare: logInToHome });
testAtEveryViewport('Setup: reminders', '/setup/reminders', { prepare: logInToHome });
testAtEveryViewport('Setup: done', '/setup/done', {
  prepare: logInJustAfterCreatingAHome,
  readyText: 'Go to Today',
});
