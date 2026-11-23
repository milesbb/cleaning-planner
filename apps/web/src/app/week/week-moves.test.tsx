import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { keyedBodyOf } from '@/test/open-job';
import { SNOOZED_VACUUM, SNOOZE_VACUUM, dayRow, openWeek, weekAnswers } from './week-test-support';

vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: vi.fn(), replace: vi.fn() }),
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

describe('Moving a job on Week', () => {
  it('has no accessibility violations with the move sheet open', async () => {
    openWeek();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Move Vacuum the living room, to do' }),
    );
    await screen.findByRole('dialog', { name: 'Move Vacuum the living room to…' });
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('moves a job to a later day at once, as a snooze with one idempotency key', async () => {
    let answer: () => void = () => undefined;
    const client = openWeek({
      ...weekAnswers(),
      [SNOOZE_VACUUM]: () =>
        new Promise((resolve) => {
          answer = (): void => {
            void SNOOZED_VACUUM().then(resolve);
          };
        }),
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Move Vacuum the living room, to do' }),
    );
    const sheet = await screen.findByRole('dialog', { name: 'Move Vacuum the living room to…' });
    const days = within(sheet).getAllByRole('button', { name: /day/ });
    expect(days[0]).toHaveTextContent('Wednesday 25 November');
    expect(days.at(-1)).toHaveTextContent('Sunday 6 December');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Thursday 26 November' }));
    const rows = within(screen.getByRole('list', { name: 'Days' })).getAllByRole('listitem');
    expect(
      within(dayRow(rows, 3)).getByRole('img', { name: 'Vacuum the living room, to do' }),
    ).toBeInTheDocument();
    expect(within(dayRow(rows, 1)).queryByText(/Vacuum/)).toBeNull();
    expect(keyedBodyOf(client, SNOOZE_VACUUM)).toEqual({ until: '2026-11-26' });
    answer();
  });

  it('puts the job back and says so when the move is turned down', async () => {
    openWeek({
      ...weekAnswers(),
      [SNOOZE_VACUUM]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Snooze to a later day')),
    });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Move Vacuum the living room, to do' }),
    );
    const sheet = await screen.findByRole('dialog', { name: 'Move Vacuum the living room to…' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Thursday 26 November' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Snooze to a later day');
    const rows = within(screen.getByRole('list', { name: 'Days' })).getAllByRole('listitem');
    expect(
      within(dayRow(rows, 1)).getByRole('button', { name: 'Move Vacuum the living room, to do' }),
    ).toBeInTheDocument();
  });

  it('only lets a job move from the day it is next due, and never once done', async () => {
    openWeek();
    await screen.findByRole('button', { name: 'Move Vacuum the living room, to do' });
    expect(screen.getByRole('img', { name: 'Empty the bins, done' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Empty the bins/ })).not.toBeInTheDocument();
  });
});
