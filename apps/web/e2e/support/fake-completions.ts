import type { Page } from '@playwright/test';
import { fakeApi } from './fake-backend';
import { calendarDay, HOME_PATH, jobIdIn } from './fake-home-state';

const COMPLETIONS_PATH = `${HOME_PATH}/jobs/*/completions`;

// Ticking a job off adds it to `doneJobIds`; `failTicks` makes every tick fail
// with a server error. A job's history is its tick today, if any.
export async function fakeCompletions(
  page: Page,
  doneJobIds: Set<string>,
  failTicks: boolean,
): Promise<void> {
  await fakeApi(
    page,
    COMPLETIONS_PATH,
    (request) => {
      if (failTicks) {
        return { status: 500, body: { error: { code: 'internal', message: 'Broke' } } };
      }
      const jobId = jobIdIn(request.url());
      doneJobIds.add(jobId);
      return {
        status: 201,
        body: { jobId, nextDueDate: calendarDay(7), snooze: null, latestCompletion: null },
      };
    },
    { method: 'POST' },
  );
  await fakeApi(
    page,
    COMPLETIONS_PATH,
    (request) => {
      const jobId = jobIdIn(request.url());
      const doneToday = {
        jobId,
        outcome: 'done',
        completedOn: calendarDay(0),
        completedBy: 'user-alex',
        doneAt: new Date().toISOString(),
      };
      return { body: doneJobIds.has(jobId) ? [doneToday] : [] };
    },
    { method: 'GET' },
  );
}
