import { screen } from '@testing-library/react';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { TODAY_FIXTURE } from './today-fixture';
import { TodayScreen } from './today-screen';

// Alex's home on Tuesday 24 November 2026, answered by a fake API: shared by
// Today's screen tests.

export const HOME = '/v1/households/home-1';
export const AGENDA = `GET ${HOME}/agenda?from=2026-11-24&to=2026-11-25`;
export const SAVED = {
  jobId: 'job-hob',
  nextDueDate: '2026-11-25',
  snooze: null,
  latestCompletion: null,
};
export const NEVER = (): Promise<never> => new Promise(() => undefined);

export function homeAnswers(agenda: unknown = TODAY_FIXTURE.agenda): FakeAnswers {
  return {
    'GET /v1/households': () =>
      Promise.resolve([{ id: 'home-1', name: 'Our flat', role: 'member' }]),
    'GET /v1/me': () =>
      Promise.resolve({ id: 'user-alex', name: 'Alex', email: 'alex@example.com', colour: 'pink' }),
    [`GET ${HOME}`]: () =>
      Promise.resolve({
        id: 'home-1',
        name: 'Our flat',
        timeZone: 'Europe/London',
        weekStartsOn: 'monday',
        ownerId: 'user-sam',
        version: 1,
      }),
    [`GET ${HOME}/members`]: () => Promise.resolve(TODAY_FIXTURE.members),
    [`GET ${HOME}/rooms`]: () => Promise.resolve(TODAY_FIXTURE.rooms),
    [`GET ${HOME}/jobs`]: () => Promise.resolve(TODAY_FIXTURE.jobs),
    [AGENDA]: () => Promise.resolve(agenda),
  };
}

export function openToday(answers: FakeAnswers = homeAnswers()): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<TodayScreen />, client);
  return client;
}

export function section(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}
