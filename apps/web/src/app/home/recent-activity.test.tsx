import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { HomeScreen } from './home-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/home',
}));

const RECENT = `GET ${HOME_PATH}/activity?limit=10`;
const ALL = `GET ${HOME_PATH}/activity?limit=50`;

function entries(count: number): ActivityEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    jobId: `job-${String(index)}`,
    jobName: `Job ${String(index + 1)}`,
    outcome: 'done',
    completedOn: parseCalendarDate('2026-11-24'),
    completedBy: 'user-sam',
    doneAt: `2026-11-24T08:${String(59 - index).padStart(2, '0')}:00.000Z`,
  }));
}

function openHome(answers: FakeAnswers): FakeApiClient {
  const client = clientAnswering({ ...homeAnswers(), ...answers });
  renderWithApi(<HomeScreen />, client);
  return client;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('Recently on Home', () => {
  it('has no accessibility violations', async () => {
    openHome({ [RECENT]: () => Promise.resolve(entries(3)) });
    await screen.findByRole('list', { name: 'Recently done' });
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('lists the last done and skipped jobs, newest first', async () => {
    openHome({
      [RECENT]: () =>
        Promise.resolve([
          ...entries(1),
          {
            ...entries(1)[0],
            jobName: 'Clean the oven',
            outcome: 'skipped',
            completedOn: parseCalendarDate('2026-11-23'),
            completedBy: 'user-alex',
          },
        ]),
    });
    const list = await screen.findByRole('list', { name: 'Recently done' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Sam · Job 1 · Today', 'You · Skipped Clean the oven · Yesterday']);
    expect(screen.queryByRole('button', { name: 'See all' })).not.toBeInTheDocument();
  });

  it('says it is getting them while they load', async () => {
    openHome({ [RECENT]: () => new Promise(() => undefined) });
    expect(await screen.findByText('Getting what’s been done…')).toBeInTheDocument();
  });

  it('says when nothing has been done yet', async () => {
    openHome({ [RECENT]: () => Promise.resolve([]) });
    expect(
      await screen.findByText('Nothing yet. Jobs show up here once someone ticks them off.'),
    ).toBeInTheDocument();
  });

  it('explains when they cannot be loaded, and tries again', async () => {
    let attempts = 0;
    const client = openHome({
      [RECENT]: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new ApiRequestError('rejected', 'Something went wrong. Try again.'))
          : Promise.resolve(entries(1));
      },
    });
    const section = await screen.findByRole('region', { name: 'Recently' });
    expect(await within(section).findByText(/Couldn’t get what’s been done\./)).toBeInTheDocument();
    await userEvent.click(within(section).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Recently done' })).toBeInTheDocument();
    expect(client.calls.filter((call) => call === RECENT)).toHaveLength(2);
  });

  it('shows up to 50 in a sheet when there may be more', async () => {
    const client = openHome({
      [RECENT]: () => Promise.resolve(entries(10)),
      [ALL]: () => Promise.resolve(entries(14)),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'See all' }));
    const sheet = await screen.findByRole('dialog', { name: 'Recently done' });
    await waitFor(() => {
      expect(within(sheet).getAllByRole('listitem')).toHaveLength(14);
    });
    expect(client.calls).toContain(ALL);
  });

  it('only asks for the longer list once the sheet opens', async () => {
    const client = openHome({ [RECENT]: () => Promise.resolve(entries(10)) });
    await screen.findByRole('button', { name: 'See all' });
    expect(client.calls).not.toContain(ALL);
  });
});
