import type { Page } from '@playwright/test';
import { asObject, fakeApi } from './fake-backend';
import { calendarDay, HOME_PATH, jobIdIn } from './fake-home-state';

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

// Jobs can be added, renamed and removed; a snooze is accepted but changes nothing.
export async function fakeJobs(page: Page): Promise<void> {
  const jobs = JOBS.map((saved) => ({ ...saved }));
  await fakeApi(page, `${HOME_PATH}/jobs`, () => ({ body: jobs }), { method: 'GET' });
  await fakeApi(
    page,
    `${HOME_PATH}/jobs`,
    (request) => {
      const added: Record<string, unknown> = {
        id: `job-${String(jobs.length + 1)}`,
        libraryId: null,
        startDate: calendarDay(0),
        snooze: null,
        version: 1,
        ...asObject(request.postDataJSON()),
      };
      jobs.push(added);
      return { status: 201, body: added };
    },
    { method: 'POST' },
  );
  await fakeApi(
    page,
    `${HOME_PATH}/jobs/*`,
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
    `${HOME_PATH}/jobs/*`,
    (request) => {
      const index = jobs.findIndex((candidate) => candidate.id === jobIdIn(request.url()));
      if (index >= 0) jobs.splice(index, 1);
      return { status: 204, body: undefined };
    },
    { method: 'DELETE' },
  );
  await fakeApi(page, `${HOME_PATH}/jobs/*/snooze`, (request) => ({
    body: {
      jobId: jobIdIn(request.url()),
      nextDueDate: calendarDay(3),
      snooze: null,
      latestCompletion: null,
    },
  }));
}
