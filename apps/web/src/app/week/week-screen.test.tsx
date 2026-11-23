import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { WeekScreen } from './week-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/week',
}));

const HOME = '/v1/households/home-1';
const THIS_WEEK = `GET ${HOME}/agenda?from=2026-11-23&to=2026-11-29`;
const NEXT_WEEK = `GET ${HOME}/agenda?from=2026-11-30&to=2026-12-06`;
const LAST_WEEK = `GET ${HOME}/agenda?from=2026-11-16&to=2026-11-22`;
const COMING_UP = `GET ${HOME}/agenda?from=2026-11-30&to=2026-12-27`;
const NEVER = (): Promise<never> => new Promise(() => undefined);

function day(date: string, due: object[] = [], done: object[] = []): object {
  return { date, due, done };
}

function emptyWeek(from: number, month = '11'): object {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, Number(month) - 1, from + index));
    return day(date.toISOString().slice(0, 10));
  });
  return { late: [], days };
}

function comingUpAgenda(dueOn: Record<string, string[]> = {}): object {
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

const COMING_UP_AGENDA = comingUpAgenda({
  '2026-12-01': ['job-oven'],
  '2026-12-09': ['job-bed'],
});

const THIS_WEEK_AGENDA = {
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

function weekAnswers(): FakeAnswers {
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
  };
}

function dayRow(days: readonly HTMLElement[], index: number): HTMLElement {
  const row = days[index];
  if (row === undefined) throw new Error(`No day ${String(index)}`);
  return row;
}

function openWeek(answers: FakeAnswers = weekAnswers()): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<WeekScreen />, client);
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

describe('WeekScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<WeekScreen />, clientAnswering(weekAnswers()));
    await screen.findByRole('heading', { name: 'This week', level: 1 });
    await screen.findByRole('link', { name: /Clean the oven/ });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the week ready while it loads', () => {
    openWeek({ ...weekAnswers(), [THIS_WEEK]: NEVER });
    expect(screen.getByRole('status')).toHaveTextContent('Getting the week ready');
  });

  it('shows each day of the home’s week with its jobs, today marked', async () => {
    openWeek();
    expect(await screen.findByText('23 November – 29 November · 1 of 3 done')).toBeInTheDocument();
    const days = within(screen.getByRole('list', { name: 'Days' })).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(
      within(dayRow(days, 0)).getByRole('img', { name: 'Wipe the hob, late' }),
    ).toBeInTheDocument();
    expect(
      within(dayRow(days, 0)).getByRole('img', { name: 'Empty the bins, done' }),
    ).toBeInTheDocument();
    expect(within(dayRow(days, 1)).getByText('Today')).toBeInTheDocument();
    expect(within(dayRow(days, 2)).getByText('Nothing planned')).toBeInTheDocument();
  });

  it('moves to next week and back', async () => {
    const client = openWeek();
    await userEvent.click(await screen.findByRole('button', { name: 'Next week' }));
    expect(await screen.findByRole('heading', { name: 'Next week', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('30 November – 6 December · nothing planned')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(await screen.findByRole('heading', { name: 'Last week', level: 1 })).toBeInTheDocument();
    expect(client.calls).toContain(LAST_WEEK);
  });

  it('follows a home whose week starts on Sunday', async () => {
    const sundayWeek = `GET ${HOME}/agenda?from=2026-11-22&to=2026-11-28`;
    const client = openWeek({
      ...weekAnswers(),
      [`GET ${HOME}`]: () =>
        Promise.resolve({
          id: 'home-1',
          name: 'Our flat',
          timeZone: 'Europe/London',
          weekStartsOn: 'sunday',
          ownerId: 'user-sam',
          version: 1,
        }),
      [sundayWeek]: () => Promise.resolve(emptyWeek(22)),
    });
    expect(await screen.findByText(/22 November – 28 November/)).toBeInTheDocument();
    expect(client.calls).toContain(sundayWeek);
  });

  it('sends someone without a home to start one', async () => {
    openWeek({ ...weekAnswers(), 'GET /v1/households': () => Promise.resolve([]) });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/homes/new');
    });
  });

  it('explains when the week cannot be loaded, and tries again', async () => {
    let attempts = 0;
    openWeek({
      ...weekAnswers(),
      [THIS_WEEK]: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new ApiRequestError('rejected', 'You’re not in that home any more'))
          : Promise.resolve(THIS_WEEK_AGENDA);
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re not in that home any more');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'This week', level: 1 })).toBeInTheDocument();
  });
  it('shows what is coming up in the next four weeks, grouped by week', async () => {
    openWeek();
    const comingUp = await screen.findByRole('region', { name: 'Coming up' });
    const weeks = await within(comingUp).findAllByRole('heading', { level: 3 });
    expect(weeks.map((heading) => heading.textContent)).toEqual([
      'Week of 30 November',
      'Week of 7 December',
      'Week of 14 December',
      'Week of 21 December',
    ]);
    const oven = within(comingUp).getByRole('link', { name: /Clean the oven/ });
    expect(oven).toHaveAttribute('href', '/job?id=job-oven');
    expect(oven).toHaveTextContent('Tuesday 1 December');
    expect(within(comingUp).getByRole('region', { name: 'Week of 14 December' })).toHaveTextContent(
      'Nothing due.',
    );
  });

  it('says when nothing is coming up', async () => {
    openWeek({ ...weekAnswers(), [COMING_UP]: () => Promise.resolve(comingUpAgenda()) });
    const comingUp = await screen.findByRole('region', { name: 'Coming up' });
    expect(
      await within(comingUp).findByText('Nothing due in the next four weeks.'),
    ).toBeInTheDocument();
  });

  it('says it is looking further ahead while coming up loads', async () => {
    openWeek({ ...weekAnswers(), [COMING_UP]: NEVER });
    const comingUp = await screen.findByRole('region', { name: 'Coming up' });
    expect(within(comingUp).getByRole('status')).toHaveTextContent('Looking further ahead');
  });

  it('explains when coming up cannot be loaded, and tries again', async () => {
    let attempts = 0;
    openWeek({
      ...weekAnswers(),
      [COMING_UP]: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new ApiRequestError('rejected', 'Ask for fewer days'))
          : Promise.resolve(COMING_UP_AGENDA);
      },
    });
    const comingUp = await screen.findByRole('region', { name: 'Coming up' });
    expect(await within(comingUp).findByRole('alert')).toHaveTextContent('Ask for fewer days');
    await userEvent.click(within(comingUp).getByRole('button', { name: 'Try again' }));
    expect(
      await within(comingUp).findByRole('link', { name: /Clean the oven/ }),
    ).toBeInTheDocument();
  });

  it('only looks ahead from this week', async () => {
    openWeek();
    await screen.findByRole('region', { name: 'Coming up' });
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    await screen.findByRole('heading', { name: 'Next week', level: 1 });
    expect(screen.queryByRole('region', { name: 'Coming up' })).not.toBeInTheDocument();
  });
});
