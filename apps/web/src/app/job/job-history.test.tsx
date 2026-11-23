import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api/api-client';
import { OVEN_PATH, openOven } from '@/test/open-job';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/job',
}));

const HISTORY = `GET ${OVEN_PATH}/completions`;
const LATEST = {
  jobId: 'job-oven',
  outcome: 'done',
  completedOn: '2026-11-20',
  completedBy: 'user-sam',
  doneAt: '2026-11-20T18:00:00.000Z',
};
const EARLIER = {
  ...LATEST,
  outcome: 'skipped',
  completedOn: '2026-11-13',
  completedBy: 'user-alex',
  doneAt: '2026-11-13T18:00:00.000Z',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('a job’s history', () => {
  it('lists each time it was done or skipped, newest first', async () => {
    await openOven({ [HISTORY]: () => Promise.resolve([LATEST, EARLIER]) });
    const history = screen.getByRole('region', { name: 'History' });
    const entries = await within(history).findAllByRole('listitem');
    expect(entries.map((entry) => entry.textContent)).toEqual([
      'Done by Sam on 20 November',
      'Skipped by You on 13 November',
    ]);
  });

  it('says when it has never been done', async () => {
    await openOven({ [HISTORY]: () => Promise.resolve([]) });
    expect(await screen.findByText('Not done yet')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Times done' })).not.toBeInTheDocument();
  });

  it('explains when the history cannot be loaded, and tries again', async () => {
    let attempts = 0;
    await openOven({
      [HISTORY]: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new ApiRequestError('rejected', 'That job has been removed'))
          : Promise.resolve([LATEST]);
      },
    });
    const history = screen.getByRole('region', { name: 'History' });
    expect(await within(history).findByText(/Couldn’t get the full history/)).toBeInTheDocument();
    await userEvent.click(within(history).getByRole('button', { name: 'Try again' }));
    expect(await within(history).findByText('Done by Sam on 20 November')).toBeInTheDocument();
  });
});
