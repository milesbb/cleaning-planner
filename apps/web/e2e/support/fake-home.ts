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

function job(id: string, roomId: string, name: string, icon: string): Record<string, unknown> {
  return {
    id,
    roomId,
    libraryId: id === 'job-oven' ? 'kitchen.oven' : null,
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

function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let time = Date.parse(from); time <= Date.parse(to); time += DAY_MS) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}

function dueItemsFor(doneJobIds: ReadonlySet<string>): DueItem[] {
  return [
    due('job-oven', -2, 'late'),
    due('job-vacuum', 0, 'today'),
    due('job-hob', 0, 'today'),
  ].filter((item) => !doneJobIds.has(item.jobId));
}

function asObject(value: unknown): object {
  return typeof value === 'object' && value !== null ? value : {};
}

// The agenda for the days asked for: the oven is late (due two days ago), the
// vacuum and hob are due today, and anything ticked off is done today.
function agendaFor(url: string, doneJobIds: ReadonlySet<string>): object {
  const query = new URL(url).searchParams;
  const dueItems = dueItemsFor(doneJobIds);
  return {
    late: dueItems.filter((item) => item.status === 'late'),
    days: daysBetween(query.get('from') ?? calendarDay(0), query.get('to') ?? calendarDay(1)).map(
      (date) => ({
        date,
        due: dueItems.filter((item) => item.dueDate === date),
        done:
          date === calendarDay(0)
            ? [...doneJobIds].map((jobId) => ({
                jobId,
                completedOn: date,
                completedBy: 'user-alex',
              }))
            : [],
      }),
    ),
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
}

function jobIdIn(url: string): string {
  return /jobs\/([^/?]+)/.exec(url)?.[1] ?? '';
}

// Jobs can be renamed and removed; a snooze is accepted but changes nothing.
async function fakeJobs(page: Page): Promise<void> {
  const jobs = JOBS.map((saved) => ({ ...saved }));
  await fakeApi(page, `${HOME}/jobs`, () => ({ body: jobs }), { method: 'GET' });
  await fakeApi(
    page,
    `${HOME}/jobs/*`,
    (request) => {
      const saved = jobs.find((candidate) => candidate.id === jobIdIn(request.url()));
      if (saved === undefined) return { status: 404, body: { error: { code: 'notFound' } } };
      Object.assign(saved, asObject(request.postDataJSON()), {
        version: Number(saved.version) + 1,
      });
      return { body: saved };
    },
    { method: 'PATCH' },
  );
  await fakeApi(
    page,
    `${HOME}/jobs/*`,
    (request) => {
      const index = jobs.findIndex((candidate) => candidate.id === jobIdIn(request.url()));
      if (index >= 0) jobs.splice(index, 1);
      return { status: 204, body: undefined };
    },
    { method: 'DELETE' },
  );
  await fakeApi(page, `${HOME}/jobs/*/snooze`, (request) => ({
    body: {
      jobId: jobIdIn(request.url()),
      nextDueDate: calendarDay(3),
      snooze: null,
      latestCompletion: null,
    },
  }));
}

// `failTicks` makes every tick fail with a server error.
async function fakeHome(page: Page, { failTicks = false } = {}): Promise<void> {
  const doneJobIds = new Set<string>();
  await fakeHomeReads(page);
  await fakeJobs(page);
  await fakeApi(page, `${HOME}/agenda*`, (request) => ({
    body: agendaFor(request.url(), doneJobIds),
  }));
  const rooms: object[] = [...ROOMS];
  await fakeApi(page, `${HOME}/rooms`, () => ({ body: rooms }), { method: 'GET' });
  await fakeApi(
    page,
    `${HOME}/rooms`,
    (request) => {
      const room = {
        id: `room-${String(rooms.length + 1)}`,
        order: rooms.length,
        appliances: [],
        version: 1,
        ...asObject(request.postDataJSON()),
      };
      rooms.push(room);
      return { status: 201, body: room };
    },
    { method: 'POST' },
  );
  await fakeApi(page, `${HOME}/progress`, () => ({
    body: dueItemsFor(doneJobIds).map((item) => ({
      jobId: item.jobId,
      nextDueDate: item.dueDate,
      snooze: null,
      latestCompletion: null,
    })),
  }));
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
