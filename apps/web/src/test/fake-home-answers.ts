import { TODAY_FIXTURE } from '@/app/today/today-fixture';
import type { FakeAnswers } from './fake-api-client';

// Alex's home "Our flat" on Tuesday 24 November 2026, for screens that read
// the home's rooms, jobs, next due dates and people.

export const HOME_PATH = '/v1/households/home-1';

const NEXT_DUE: Record<string, string> = {
  'job-oven': '2026-11-22',
  'job-hob': '2026-11-24',
  'job-bins': '2026-11-27',
  'job-vacuum': '2026-11-24',
  'job-bed': '2026-11-25',
};

export function homeAnswers(): FakeAnswers {
  return {
    'GET /v1/households': () =>
      Promise.resolve([{ id: 'home-1', name: 'Our flat', role: 'member' }]),
    'GET /v1/me': () =>
      Promise.resolve({ id: 'user-alex', name: 'Alex', email: 'alex@example.com', colour: 'pink' }),
    [`GET ${HOME_PATH}`]: () =>
      Promise.resolve({
        id: 'home-1',
        name: 'Our flat',
        timeZone: 'Europe/London',
        weekStartsOn: 'monday',
        ownerId: 'user-sam',
        version: 1,
      }),
    [`GET ${HOME_PATH}/members`]: () => Promise.resolve(TODAY_FIXTURE.members),
    [`GET ${HOME_PATH}/rooms`]: () => Promise.resolve(TODAY_FIXTURE.rooms),
    [`GET ${HOME_PATH}/jobs`]: () => Promise.resolve(TODAY_FIXTURE.jobs),
    [`GET ${HOME_PATH}/progress`]: () =>
      Promise.resolve(
        Object.entries(NEXT_DUE).map(([jobId, nextDueDate]) => ({
          jobId,
          nextDueDate,
          snooze: null,
          latestCompletion: null,
        })),
      ),
  };
}
