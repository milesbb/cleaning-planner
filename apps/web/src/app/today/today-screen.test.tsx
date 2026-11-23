import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { TODAY_FIXTURE } from './today-fixture';
import { TodayScreen } from './today-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/today',
}));

const HOME = '/v1/households/home-1';
const AGENDA = `GET ${HOME}/agenda?from=2026-11-24&to=2026-11-25`;
const DONE_HOB = `POST ${HOME}/jobs/job-hob/completions`;
const UNDO_BINS = `DELETE ${HOME}/jobs/job-bins/completions/latest`;
const SAVED = {
  jobId: 'job-hob',
  nextDueDate: '2026-11-25',
  snooze: null,
  latestCompletion: null,
};
const NEVER = (): Promise<never> => new Promise(() => undefined);

function homeAnswers(agenda: unknown = TODAY_FIXTURE.agenda): FakeAnswers {
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

function openToday(answers: FakeAnswers = homeAnswers()): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<TodayScreen />, client);
  return client;
}

function section(name: string): HTMLElement {
  return screen.getByRole('region', { name });
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

describe('TodayScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<TodayScreen />, clientAnswering(homeAnswers()));
    await screen.findByRole('heading', { name: 'Today', level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting today ready while it loads', () => {
    openToday({ ...homeAnswers(), [AGENDA]: NEVER });
    expect(screen.getByRole('status')).toHaveTextContent('Getting today ready');
  });

  it('shows late, today, done and tomorrow for the current home', async () => {
    openToday();
    expect(await screen.findByText('Tuesday 24 November · about 50 min')).toBeInTheDocument();
    expect(within(section('Late')).getByText('Clean the oven')).toBeInTheDocument();
    expect(within(section('Late')).getByText('2 days late')).toBeInTheDocument();
    expect(within(section('Today')).getByText('Vacuum the living room')).toBeInTheDocument();
    expect(within(section('Done today')).getByText('Done by Sam')).toBeInTheDocument();
    expect(within(section('Tomorrow')).getByText('Change the bed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Our flat/ })).toBeInTheDocument();
  });

  it('opens each due and upcoming job on its own screen', async () => {
    openToday();
    await screen.findByText('Tuesday 24 November · about 50 min');
    expect(within(section('Late')).getByRole('link', { name: /Clean the oven/ })).toHaveAttribute(
      'href',
      '/job?id=job-oven',
    );
    expect(
      within(section('Tomorrow')).getByRole('link', { name: /Change the bed/ }),
    ).toHaveAttribute('href', '/job?id=job-bed');
  });

  it('ticks a job off at once, before the server answers', async () => {
    const client = openToday({ ...homeAnswers(), [DONE_HOB]: NEVER });
    await userEvent.click(await screen.findByRole('button', { name: 'Mark Wipe the hob as done' }));
    expect(within(section('Done today')).getByText('Wipe the hob')).toBeInTheDocument();
    expect(within(section('Today')).queryByText('Wipe the hob')).not.toBeInTheDocument();
    expect(client.calls).toContain(DONE_HOB);
    expect(client.bodies.at(-1)).toMatchObject({ outcome: 'done', completedOn: '2026-11-24' });
  });

  it('puts the job back and says why when ticking fails', async () => {
    openToday({
      ...homeAnswers(),
      [DONE_HOB]: () =>
        Promise.reject(
          new ApiRequestError('rejected', 'That job was deleted', { code: 'notFound' }),
        ),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Mark Wipe the hob as done' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That job was deleted');
    expect(within(section('Today')).getByText('Wipe the hob')).toBeInTheDocument();
  });

  it('saves a tick and refreshes the home', async () => {
    const client = openToday({ ...homeAnswers(), [DONE_HOB]: () => Promise.resolve(SAVED) });
    await userEvent.click(await screen.findByRole('button', { name: 'Mark Wipe the hob as done' }));
    await waitFor(() => {
      expect(client.calls.filter((call) => call === AGENDA).length).toBeGreaterThan(1);
    });
  });

  it('undoes a job at once', async () => {
    const client = openToday({ ...homeAnswers(), [UNDO_BINS]: NEVER });
    await userEvent.click(await screen.findByRole('button', { name: 'Undo Empty the bins' }));
    expect(screen.queryByRole('region', { name: 'Done today' })).not.toBeInTheDocument();
    expect(client.calls).toContain(UNDO_BINS);
  });

  it('shows just my jobs when asked', async () => {
    const client = openToday({
      ...homeAnswers(),
      [`${AGENDA}&person=user-alex`]: () =>
        Promise.resolve({ late: [], days: TODAY_FIXTURE.agenda.days }),
    });
    await userEvent.click(await screen.findByRole('radio', { name: 'Just me' }));
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Late' })).not.toBeInTheDocument();
    });
    expect(client.calls).toContain(`${AGENDA}&person=user-alex`);
  });

  it('celebrates calmly when everything is done, and says what is first tomorrow', async () => {
    const [today, tomorrow] = TODAY_FIXTURE.agenda.days;
    openToday(homeAnswers({ late: [], days: [{ ...today, due: [] }, tomorrow] }));
    expect(await screen.findByRole('heading', { name: 'All done for today' })).toBeInTheDocument();
    expect(screen.getByText('First up tomorrow: Change the bed.')).toBeInTheDocument();
    expect(screen.getByText('Tuesday 24 November · all done')).toBeInTheDocument();
  });

  it('sends someone without a home to start one', async () => {
    openToday({ ...homeAnswers(), 'GET /v1/households': () => Promise.resolve([]) });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/homes/new');
    });
  });

  it('explains when today cannot be loaded, and tries again', async () => {
    let attempts = 0;
    openToday({
      ...homeAnswers(),
      [`GET ${HOME}/jobs`]: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new ApiRequestError('rejected', 'You’re not in that home any more'))
          : Promise.resolve(TODAY_FIXTURE.jobs);
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re not in that home any more');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Clean the oven')).toBeInTheDocument();
  });
});
