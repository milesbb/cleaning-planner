import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import {
  NEVER,
  THIS_WEEK,
  THIS_WEEK_AGENDA,
  emptyWeek,
  weekAnswers,
} from '../week/week-test-support';
import { WeekStrip } from './week-strip';

const PROGRESS = 'GET /v1/households/home-1/progress';

function openStrip(answers: FakeAnswers = weekAnswers()): FakeApiClient {
  const client = clientAnswering(answers);
  renderWithApi(<WeekStrip householdId="home-1" />, client);
  return client;
}

function dayLinks(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Days' })).getAllByRole('link');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('WeekStrip', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(
      <WeekStrip householdId="home-1" />,
      clientAnswering(weekAnswers()),
    );
    await screen.findByText('1 of 3 done');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the week while it loads', () => {
    openStrip({ ...weekAnswers(), [THIS_WEEK]: NEVER });
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Getting the week…');
  });

  it("shows this week's seven days, each opening the week, with today marked", async () => {
    openStrip();
    expect(await screen.findByText('1 of 3 done')).toBeInTheDocument();
    const days = dayLinks();
    expect(days).toHaveLength(7);
    days.forEach((day) => {
      expect(day).toHaveAttribute('href', '/week');
    });
    expect(days[1]).toHaveAttribute('aria-current', 'date');
    expect(within(days[1] ?? document.body).getByText('Today')).toBeInTheDocument();
  });

  it('shows the jobs as pictures, not buttons, because moving them belongs on Week', async () => {
    openStrip();
    await screen.findByText('1 of 3 done');
    expect(screen.getByRole('img', { name: 'Vacuum the living room, to do' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move/ })).not.toBeInTheDocument();
  });

  it('offers the whole week', async () => {
    openStrip();
    expect(await screen.findByRole('link', { name: 'See the week' })).toHaveAttribute(
      'href',
      '/week',
    );
  });

  it('needs only the week, not which jobs can move', async () => {
    const client = openStrip();
    await screen.findByText('1 of 3 done');
    expect(client.calls).toContain(THIS_WEEK);
    expect(client.calls).not.toContain(PROGRESS);
  });

  it('says nothing is planned in an empty week', async () => {
    openStrip({ ...weekAnswers(), [THIS_WEEK]: () => Promise.resolve(emptyWeek(23)) });
    expect(await screen.findByText('Nothing planned', { selector: 'p' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Days' })).getAllByText('Nothing planned'),
    ).toHaveLength(7);
  });

  it('says what went wrong and tries again', async () => {
    let attempts = 0;
    openStrip({
      ...weekAnswers(),
      [THIS_WEEK]: () => {
        attempts += 1;
        if (attempts === 1) {
          return Promise.reject(new ApiRequestError('rejected', 'Ask for fewer days'));
        }
        return Promise.resolve(THIS_WEEK_AGENDA);
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Ask for fewer days');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    });
  });
});
