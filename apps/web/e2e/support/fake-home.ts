import type { Page } from '@playwright/test';
import { fakeApi, fakeCognito, openPage } from './fake-backend';

// A signed-in Alex with one home, "Our flat", whose agenda remembers what was
// ticked off. Dates follow the real clock in UTC, the home's time zone.

const HOME = '/v1/households/home-1';
const DAY_MS = 86_400_000;

function calendarDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

const MEMBERS = [
  { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'member' },
  { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' },
];

const ROOMS = [
  { id: 'room-kitchen', type: 'kitchen', name: 'Kitchen', order: 0, appliances: [], version: 1 },
  {
    id: 'room-living',
    type: 'livingRoom',
    name: 'Living room',
    order: 1,
    appliances: [],
    version: 1,
  },
];

function job(id: string, roomId: string, name: string, icon: string): object {
  return {
    id,
    roomId,
    libraryId: null,
    name,
    icon,
    schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
    startDate: calendarDay(-30),
    assignment: { kind: 'anyone' },
    snooze: null,
    effortMinutes: 10,
    version: 1,
  };
}

const JOBS = [
  job('job-oven', 'room-kitchen', 'Clean the oven', 'oven'),
  job('job-vacuum', 'room-living', 'Vacuum the living room', 'vacuum'),
  job('job-hob', 'room-kitchen', 'Wipe the hob', 'spray'),
];

interface DueItem {
  jobId: string;
  dueDate: string;
  status: string;
  assignee: null;
}

function due(jobId: string, offsetDays: number, status: string): DueItem {
  return { jobId, dueDate: calendarDay(offsetDays), status, assignee: null };
}

function agendaWithout(doneJobIds: ReadonlySet<string>): object {
  const notDone = (item: DueItem): boolean => !doneJobIds.has(item.jobId);
  const late = [due('job-oven', -2, 'late')];
  const today = [due('job-vacuum', 0, 'today'), due('job-hob', 0, 'today')];
  return {
    late: late.filter(notDone),
    days: [
      {
        date: calendarDay(0),
        due: today.filter(notDone),
        done: [...doneJobIds].map((jobId) => ({
          jobId,
          completedOn: calendarDay(0),
          completedBy: 'user-alex',
        })),
      },
      { date: calendarDay(1), due: [], done: [] },
    ],
  };
}

async function fakeHomeReads(page: Page): Promise<void> {
  await fakeApi(page, '/v1/households', {
    body: [{ id: 'home-1', name: 'Our flat', role: 'member' }],
  });
  await fakeApi(page, '/v1/me', {
    body: { id: 'user-alex', name: 'Alex', email: 'alex@example.com', colour: 'pink' },
  });
  await fakeApi(page, HOME, {
    body: {
      id: 'home-1',
      name: 'Our flat',
      timeZone: 'UTC',
      weekStartsOn: 'monday',
      ownerId: 'user-sam',
      version: 1,
    },
  });
  await fakeApi(page, `${HOME}/members`, { body: MEMBERS });
  await fakeApi(page, `${HOME}/rooms`, { body: ROOMS });
  await fakeApi(page, `${HOME}/jobs`, { body: JOBS });
}

// `failTicks` makes every tick fail with a server error.
async function fakeHome(page: Page, { failTicks = false } = {}): Promise<void> {
  const doneJobIds = new Set<string>();
  await fakeHomeReads(page);
  await fakeApi(page, `${HOME}/agenda*`, () => ({ body: agendaWithout(doneJobIds) }));
  await fakeApi(page, `${HOME}/jobs/*/completions`, (request) => {
    if (failTicks) return { status: 500, body: { error: { code: 'internal', message: 'Broke' } } };
    const jobId = /jobs\/([^/]+)\/completions/.exec(request.url())?.[1] ?? '';
    doneJobIds.add(jobId);
    return {
      status: 201,
      body: { jobId, nextDueDate: calendarDay(7), snooze: null, latestCompletion: null },
    };
  });
}

export async function logInToHome(
  page: Page,
  options: { failTicks?: boolean } = {},
): Promise<void> {
  await fakeCognito(page);
  await fakeHome(page, options);
  await openPage(page, '/sign-in');
  await page.getByLabel('Email', { exact: true }).fill('alex@example.com');
  await page.getByLabel('Password', { exact: true }).fill('lemon kettle sunday');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/today\/?$/);
}
