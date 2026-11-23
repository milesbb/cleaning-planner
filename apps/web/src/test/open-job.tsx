import { screen } from '@testing-library/react';
import { expect } from 'vitest';
import { TODAY_FIXTURE } from '@/app/today/today-fixture';
import { JobScreen } from '@/app/job/job-screen';
import { clientAnswering, renderWithApi } from './fake-api-client';
import type { FakeAnswers, FakeApiClient } from './fake-api-client';
import { HOME_PATH, homeAnswers } from './fake-home-answers';

// Opens Job detail for the home in fake-home-answers.ts and reads what it sent.

export const OVEN_PATH = `${HOME_PATH}/jobs/job-oven`;

const UUID = /^[0-9a-f-]{36}$/;

// The oven as the library's "Clean the oven", with its advice and recommendation.
export function answersWithLibraryOven(): FakeAnswers {
  return {
    ...homeAnswers(),
    [`GET ${HOME_PATH}/jobs`]: () =>
      Promise.resolve(
        TODAY_FIXTURE.jobs.map((job) =>
          job.id === 'job-oven' ? { ...job, libraryId: 'kitchen.oven' } : job,
        ),
      ),
  };
}

export function openJob(address: string, answers: FakeAnswers = homeAnswers()): FakeApiClient {
  window.history.replaceState(null, '', address);
  const client = clientAnswering(answers);
  renderWithApi(<JobScreen />, client);
  return client;
}

export async function openOven(
  extraAnswers: FakeAnswers = {},
  answers: FakeAnswers = homeAnswers(),
): Promise<FakeApiClient> {
  const client = openJob('/job?id=job-oven', { ...answers, ...extraAnswers });
  await screen.findByRole('heading', { name: 'Clean the oven', level: 1 });
  return client;
}

export function bodyOf(client: FakeApiClient, route: string): unknown {
  return client.bodies[client.calls.indexOf(route)];
}

// The body without its idempotency key, after checking the key is a UUID.
export function keyedBodyOf(client: FakeApiClient, route: string): Record<string, unknown> {
  const body = bodyOf(client, route);
  const fields = typeof body === 'object' && body !== null ? Object.entries(body) : [];
  expect(fields.find(([name]) => name === 'idempotencyKey')?.[1]).toMatch(UUID);
  return Object.fromEntries(fields.filter(([name]) => name !== 'idempotencyKey'));
}
