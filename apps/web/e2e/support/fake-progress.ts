import type { Page } from '@playwright/test';
import { fakeApi } from './fake-backend';
import { dueItemsFor, HOME_PATH } from './fake-home-state';

export async function fakeProgress(page: Page, doneJobIds: ReadonlySet<string>): Promise<void> {
  await fakeApi(page, `${HOME_PATH}/progress`, () => ({
    body: dueItemsFor(doneJobIds).map((item) => ({
      jobId: item.jobId,
      nextDueDate: item.dueDate,
      snooze: null,
      latestCompletion: null,
    })),
  }));
}
