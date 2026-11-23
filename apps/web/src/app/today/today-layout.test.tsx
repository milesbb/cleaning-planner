import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import { pretendTheScreenIs } from '@/test/screen-width';
import { THIS_WEEK, THIS_WEEK_AGENDA } from '../week/week-test-support';
import { TodayScreen } from './today-screen';
import { HOME, SAVED, homeAnswers, openToday, section } from './today-test-support';

vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: (): string => '/today',
}));

const WITH_THE_WEEK = {
  ...homeAnswers(),
  [THIS_WEEK]: (): Promise<unknown> => Promise.resolve(THIS_WEEK_AGENDA),
};
const DONE_HOB = `POST ${HOME}/jobs/job-hob/completions`;
const TUESDAY = 1;
const WEEK_WITH_VACUUM_DONE = {
  late: [],
  days: THIS_WEEK_AGENDA.days.map((day, index) =>
    index === TUESDAY
      ? {
          date: '2026-11-24',
          due: [],
          done: [{ jobId: 'job-vacuum', completedOn: '2026-11-24', completedBy: 'user-alex' }],
        }
      : day,
  ),
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('Today on a laptop', () => {
  beforeEach(() => {
    pretendTheScreenIs('laptop');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<TodayScreen />, clientAnswering(WITH_THE_WEEK));
    await screen.findByText('1 of 3 done');
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows this week's days beside today's jobs", async () => {
    openToday(WITH_THE_WEEK);
    const week = await screen.findByRole('region', { name: 'This week' });
    expect(await within(week).findByText('1 of 3 done')).toBeInTheDocument();
    expect(within(week).getAllByRole('link', { name: /Today|Mon|Wed/ })).not.toHaveLength(0);
    expect(within(section('Late')).getByText('Clean the oven')).toBeInTheDocument();
    expect(
      screen.getByText('Clean the oven').compareDocumentPosition(week) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("refreshes the week's progress after a job is ticked on Today", async () => {
    let weekAsked = 0;
    openToday({
      ...homeAnswers(),
      [DONE_HOB]: () => Promise.resolve(SAVED),
      [THIS_WEEK]: () => {
        weekAsked += 1;
        return Promise.resolve(weekAsked === 1 ? THIS_WEEK_AGENDA : WEEK_WITH_VACUUM_DONE);
      },
    });
    const week = await screen.findByRole('region', { name: 'This week' });
    await within(week).findByText('1 of 3 done');
    await userEvent.click(screen.getByRole('button', { name: 'Mark Wipe the hob as done' }));
    expect(await within(week).findByText('2 of 3 done')).toBeInTheDocument();
  });

  it('keeps the Everyone or Just me choice at a comfortable width', async () => {
    openToday(WITH_THE_WEEK);
    const choice = await screen.findByRole('radiogroup', { name: 'Show jobs for' });
    expect(choice.parentElement).toHaveClass('sm:max-w-sm');
  });
});

describe('Today on a phone', () => {
  beforeEach(() => {
    pretendTheScreenIs('phone');
  });

  it("leaves the week out and doesn't fetch it", async () => {
    const client = openToday(WITH_THE_WEEK);
    expect(await screen.findByText('Tuesday 24 November · about 50 min')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'This week' })).not.toBeInTheDocument();
    expect(client.calls).not.toContain(THIS_WEEK);
  });
});
