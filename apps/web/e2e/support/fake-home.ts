import type { Page } from '@playwright/test';
import { fakeCognito, openPage } from './fake-backend';
import { fakeActivity } from './fake-activity';
import { fakeAgenda } from './fake-agenda';
import { fakeCompletions } from './fake-completions';
import { fakeHousehold } from './fake-household';
import { fakeJobs } from './fake-jobs';
import { fakeProgress } from './fake-progress';
import { fakeRooms } from './fake-rooms';

// A signed-in Alex with one home, "Our flat", whose agenda remembers what was
// ticked off. Each resource has its own fake; a new endpoint adds one here.

interface FakeHomeOptions {
  failTicks?: boolean;
  isOwner?: boolean;
}

// `failTicks` makes every tick fail with a server error; `isOwner` makes Alex
// the home's owner.
export async function fakeHome(
  page: Page,
  { failTicks = false, isOwner = false }: FakeHomeOptions,
): Promise<void> {
  const doneJobIds = new Set<string>();
  await fakeHousehold(page, { isOwner });
  const jobs = await fakeJobs(page);
  await fakeAgenda(page, doneJobIds);
  await fakeRooms(page, jobs);
  await fakeProgress(page, doneJobIds);
  await fakeCompletions(page, doneJobIds, failTicks);
  await fakeActivity(page, doneJobIds, jobs);
}

export async function logInToHome(page: Page, options: FakeHomeOptions = {}): Promise<void> {
  await fakeCognito(page);
  await fakeHome(page, options);
  await openPage(page, '/sign-in');
  await page.getByLabel('Email', { exact: true }).fill('alex@example.com');
  await page.getByLabel('Password', { exact: true }).fill('lemon kettle sunday');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/today\/?$/);
}
