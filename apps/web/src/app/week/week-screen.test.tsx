import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import { WeekScreen } from './week-screen';
import {
  COMING_UP,
  COMING_UP_AGENDA,
  HOME,
  LAST_WEEK,
  NEVER,
  THIS_WEEK,
  THIS_WEEK_AGENDA,
  comingUpAgenda,
  dayRow,
  emptyWeek,
  openWeek,
  weekAnswers,
} from './week-test-support';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/week',
}));

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
      within(dayRow(days, 0)).getByRole('button', { name: 'Move Wipe the hob, late' }),
    ).toBeInTheDocument();
    expect(
      within(dayRow(days, 0)).getByRole('img', { name: 'Empty the bins, done' }),
    ).toBeInTheDocument();
    expect(within(dayRow(days, 1)).getByText('Today')).toBeInTheDocument();
    expect(within(dayRow(days, 2)).getByText('Nothing planned')).toBeInTheDocument();
  });

  it('says roughly how long each day’s jobs still to do will take', async () => {
    openWeek();
    await screen.findByText('23 November – 29 November · 1 of 3 done');
    const days = within(screen.getByRole('list', { name: 'Days' })).getAllByRole('listitem');
    expect(within(dayRow(days, 0)).getByText('about 5 min')).toBeInTheDocument();
    expect(within(dayRow(days, 1)).getByText('about 15 min')).toBeInTheDocument();
    expect(within(dayRow(days, 2)).queryByText(/about/)).not.toBeInTheDocument();
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
