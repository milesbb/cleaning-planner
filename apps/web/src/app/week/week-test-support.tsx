import { renderWithApi, clientAnswering } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { WeekScreen } from './week-screen';

// Alex's home on Tuesday 24 November 2026, as the Week screen's tests read it.

export const HOME = '/v1/households/home-1';
export const THIS_WEEK = `GET ${HOME}/agenda?from=2026-11-23&to=2026-11-29`;
const NEXT_WEEK = `GET ${HOME}/agenda?from=2026-11-30&to=2026-12-06`;
export const LAST_WEEK = `GET ${HOME}/agenda?from=2026-11-16&to=2026-11-22`;
export const COMING_UP = `GET ${HOME}/agenda?from=2026-11-30&to=2026-12-27`;
const PROGRESS = `GET ${HOME}/progress`;
export const SNOOZE_VACUUM = `POST ${HOME}/jobs/job-vacuum/snooze`;

function progressEntry(jobId: string, nextDueDate: string): object {
  return { jobId, nextDueDate, snooze: null, latestCompletion: null };
}

export const SNOOZED_VACUUM = (): Promise<unknown> =>
  Promise.resolve({
    jobId: 'job-vacuum',
    nextDueDate: '2026-11-26',
    snooze: { from: '2026-11-24', until: '2026-11-26' },
    latestCompletion: null,
  });
export const NEVER = (): Promise<never> => new Promise(() => undefined);

function day(date: string, due: object[] = [], done: object[] = []): object {
  return { date, due, done };
}

export function emptyWeek(from: number, month = '11'): object {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, Number(month) - 1, from + index));
    return day(date.toISOString().slice(0, 10));
  });
  return { late: [], days };
}

export function comingUpAgenda(dueOn: Record<string, string[]> = {}): object {
  const days = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10, 30 + index)).toISOString().slice(0, 10);
    const due = (dueOn[date] ?? []).map((jobId) => ({
      jobId,
      dueDate: date,
      status: 'later',
      assignee: null,
    }));
    return day(date, due);
  });
  return { late: [], days };
}

export const COMING_UP_AGENDA = comingUpAgenda({
  '2026-12-01': ['job-oven'],
  '2026-12-09': ['job-bed'],
});

export const THIS_WEEK_AGENDA = {
  late: [],
  days: [
    day(
      '2026-11-23',
      [{ jobId: 'job-hob', dueDate: '2026-11-23', status: 'late', assignee: null }],
      [{ jobId: 'job-bins', completedOn: '2026-11-23', completedBy: 'user-sam' }],
    ),
    day('2026-11-24', [
      { jobId: 'job-vacuum', dueDate: '2026-11-24', status: 'today', assignee: null },
    ]),
    day('2026-11-25'),
    day('2026-11-26'),
    day('2026-11-27'),
    day('2026-11-28'),
    day('2026-11-29'),
  ],
};

export function weekAnswers(): FakeAnswers {
  return {
    'GET /v1/households': () =>
      Promise.resolve([{ id: 'home-1', name: 'Our flat', role: 'member' }]),
    [`GET ${HOME}`]: () =>
      Promise.resolve({
        id: 'home-1',
        name: 'Our flat',
        timeZone: 'Europe/London',
        weekStartsOn: 'monday',
        ownerId: 'user-sam',
        version: 1,
      }),
    [`GET ${HOME}/jobs`]: () => Promise.resolve(TODAY_FIXTURE.jobs),
    [THIS_WEEK]: () => Promise.resolve(THIS_WEEK_AGENDA),
    [NEXT_WEEK]: () => Promise.resolve(emptyWeek(30)),
    [LAST_WEEK]: () => Promise.resolve(emptyWeek(16)),
    [COMING_UP]: () => Promise.resolve(COMING_UP_AGENDA),
    [PROGRESS]: () =>
      Promise.resolve([
        progressEntry('job-hob', '2026-11-23'),
        progressEntry('job-vacuum', '2026-11-24'),
      ]),
  };
}

export function dayRow(days: readonly HTMLElement[], index: number): HTMLElement {
  const row = days[index];
  if (row === undefined) throw new Error(`No day ${String(index)}`);
  return row;
}

export function openWeek(answers: FakeAnswers = weekAnswers()): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<WeekScreen />, client);
  return client;
}
