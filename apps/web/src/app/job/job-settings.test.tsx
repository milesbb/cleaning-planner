import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import type { FakeAnswers, FakeApiClient } from '@/test/fake-api-client';
import { OVEN_PATH, answersWithLibraryOven, bodyOf, openOven } from '@/test/open-job';
import { TODAY_FIXTURE } from '../today/today-fixture';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/job',
}));

const SAVED_JOB: FakeAnswers = {
  [`PATCH ${OVEN_PATH}`]: () => Promise.resolve({ ...TODAY_FIXTURE.jobs[0], version: 2 }),
};

async function openSheet(name: string, sheetTitle: string): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog', { name: sheetTitle });
}

async function saveAndClose(sheet: HTMLElement): Promise<void> {
  await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

function savedChanges(client: FakeApiClient): unknown {
  return bodyOf(client, `PATCH ${OVEN_PATH}`);
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

describe('changing how often a job repeats', () => {
  it('has no accessibility violations', async () => {
    await openOven({}, answersWithLibraryOven());
    await openSheet('Change how often', 'How often');
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('saves a custom interval after the job is done', async () => {
    const client = await openOven(SAVED_JOB);
    const sheet = await openSheet('Change how often', 'How often');
    expect(within(sheet).getByRole('radio', { name: /After it’s done/ })).toBeChecked();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Months' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'More months' }));
    await saveAndClose(sheet);
    expect(savedChanges(client)).toEqual({
      schedule: { type: 'floating', every: { value: 2, unit: 'month' } },
      version: 1,
    });
  });

  it('marks the recommended interval and can switch to it', async () => {
    await openOven({}, answersWithLibraryOven());
    const sheet = await openSheet('Change how often', 'How often');
    expect(within(sheet).queryByText('Recommended')).not.toBeInTheDocument();
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Use the recommendation: every 3 months' }),
    );
    expect(within(sheet).getByRole('radio', { name: 'Months' })).toBeChecked();
    expect(within(sheet).getByText('3')).toBeInTheDocument();
    expect(within(sheet).getByText('Recommended')).toBeInTheDocument();
  });

  it('saves set days of the week', async () => {
    const client = await openOven(SAVED_JOB);
    const sheet = await openSheet('Change how often', 'How often');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'On set days' }));
    expect(within(sheet).getByRole('checkbox', { name: 'Monday' })).toBeChecked();
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'Thursday' }));
    await saveAndClose(sheet);
    expect(savedChanges(client)).toEqual({
      schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday', 'thursday'] } },
      version: 1,
    });
  });

  it('needs at least one day of the week', async () => {
    const client = await openOven(SAVED_JOB);
    const sheet = await openSheet('Change how often', 'How often');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'On set days' }));
    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'Monday' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(within(sheet).getByText('Pick at least one day')).toBeInTheDocument();
    expect(client.calls).not.toContain(`PATCH ${OVEN_PATH}`);
  });

  it('saves a set day of the month, including the last day', async () => {
    const client = await openOven(SAVED_JOB);
    const sheet = await openSheet('Change how often', 'How often');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Once a month' }));
    await userEvent.selectOptions(
      within(sheet).getByRole('combobox', { name: 'Day of the month' }),
      'Last day',
    );
    await saveAndClose(sheet);
    expect(savedChanges(client)).toEqual({
      schedule: { type: 'fixed', on: { kind: 'monthDay', day: 'last' } },
      version: 1,
    });
  });

  it('keeps the sheet open and explains when saving fails', async () => {
    await openOven({
      [`PATCH ${OVEN_PATH}`]: () =>
        Promise.reject(new ApiRequestError('rejected', 'Someone else changed this job')),
    });
    const sheet = await openSheet('Change how often', 'How often');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Someone else changed this job',
    );
  });
});

describe('changing who does a job', () => {
  it('saves the person picked', async () => {
    const client = await openOven(SAVED_JOB);
    const sheet = await openSheet('Change who does it', 'Who does it');
    expect(within(sheet).getByRole('radio', { name: 'Anyone' })).toBeChecked();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Sam' }));
    await saveAndClose(sheet);
    expect(savedChanges(client)).toEqual({
      assignment: { kind: 'member', memberId: 'user-sam' },
      version: 1,
    });
  });

  it('can take turns', async () => {
    const client = await openOven(SAVED_JOB);
    const sheet = await openSheet('Change who does it', 'Who does it');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Take turns' }));
    await saveAndClose(sheet);
    expect(savedChanges(client)).toEqual({ assignment: { kind: 'takeTurns' }, version: 1 });
  });
});
