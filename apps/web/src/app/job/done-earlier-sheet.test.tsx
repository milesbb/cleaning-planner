import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import type { FakeAnswers } from '@/test/fake-api-client';
import { OVEN_PATH, keyedBodyOf, openOven } from '@/test/open-job';

vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: (): string => '/job',
}));

const COMPLETIONS = `POST ${OVEN_PATH}/completions`;

const SAVED_PROGRESS = (): Promise<unknown> =>
  Promise.resolve({
    jobId: 'job-oven',
    nextDueDate: '2026-11-30',
    snooze: null,
    latestCompletion: null,
  });

// Only the oven's progress, last done on `completedOn`.
function ovenLastDoneOn(completedOn: string): FakeAnswers {
  const latestCompletion = {
    jobId: 'job-oven',
    outcome: 'done',
    completedOn,
    completedBy: 'user-sam',
    doneAt: `${completedOn}T18:00:00.000Z`,
  };
  return {
    ...homeAnswers(),
    [`GET ${HOME_PATH}/progress`]: () =>
      Promise.resolve([
        { jobId: 'job-oven', nextDueDate: '2026-11-27', snooze: null, latestCompletion },
      ]),
  };
}

async function openSheet(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: 'Done on another day…' }));
  return screen.findByRole('dialog', { name: 'Done on another day' });
}

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

describe('Done on another day', () => {
  it('has no accessibility violations', async () => {
    await openOven();
    await openSheet();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('records yesterday with one idempotency key', async () => {
    const client = await openOven({ [COMPLETIONS]: SAVED_PROGRESS });
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: /Yesterday/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Marked as done on 23 November');
    expect(keyedBodyOf(client, COMPLETIONS)).toEqual({
      outcome: 'done',
      completedOn: '2026-11-23',
    });
  });

  it('records a day picked from the calendar', async () => {
    const client = await openOven({ [COMPLETIONS]: SAVED_PROGRESS });
    const sheet = await openSheet();
    await userEvent.type(within(sheet).getByLabelText('Another day'), '2026-11-18');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Marked as done on 18 November');
    expect(keyedBodyOf(client, COMPLETIONS)).toEqual({
      outcome: 'done',
      completedOn: '2026-11-18',
    });
  });

  it('turns down today and days before it was last done', async () => {
    const client = await openOven({ [COMPLETIONS]: SAVED_PROGRESS }, ovenLastDoneOn('2026-11-20'));
    const sheet = await openSheet();
    const anotherDay = within(sheet).getByLabelText('Another day');
    await userEvent.type(anotherDay, '2026-11-19');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(anotherDay).toHaveAccessibleDescription(/It was last done on 20 November/);
    await userEvent.clear(anotherDay);
    await userEvent.type(anotherDay, '2026-11-24');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(anotherDay).toHaveAccessibleDescription(/Pick a day before today/);
    expect(client.calls).not.toContain(COMPLETIONS);
  });

  it('only offers days since it was last done', async () => {
    await openOven({}, ovenLastDoneOn('2026-11-23'));
    const sheet = await openSheet();
    expect(within(sheet).getByRole('button', { name: /Yesterday/ })).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: /2 days ago/ })).not.toBeInTheDocument();
  });

  it('is not offered when it was already done today', async () => {
    await openOven({}, ovenLastDoneOn('2026-11-24'));
    expect(screen.queryByRole('button', { name: 'Done on another day…' })).not.toBeInTheDocument();
  });

  it('explains when the day cannot be saved', async () => {
    await openOven({
      [COMPLETIONS]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Pick today or an earlier day')),
    });
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole('button', { name: /2 days ago/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick today or an earlier day');
  });
});
