import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import {
  OVEN_PATH,
  answersWithLibraryOven,
  bodyOf,
  keyedBodyOf,
  openJob,
  openOven,
} from '@/test/open-job';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { JobScreen } from './job-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/job',
}));

const SAVED_PROGRESS = (): Promise<unknown> =>
  Promise.resolve({
    jobId: 'job-oven',
    nextDueDate: '2026-12-01',
    snooze: null,
    latestCompletion: null,
  });

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

describe('JobScreen', () => {
  it('has no accessibility violations', async () => {
    window.history.replaceState(null, '', '/job?id=job-oven');
    const { container } = renderWithApi(<JobScreen />, clientAnswering(answersWithLibraryOven()));
    await screen.findByRole('heading', { name: 'Clean the oven', level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the job while it loads', () => {
    openJob('/job?id=job-oven', {
      ...homeAnswers(),
      [`GET ${HOME_PATH}/jobs`]: () => new Promise(() => undefined),
    });
    expect(screen.getByRole('status')).toHaveTextContent('Getting the job');
  });

  it('shows when it is due, how often, who it is for and when it was last done', async () => {
    await openOven();
    expect(screen.getByRole('region', { name: 'Room' })).toHaveTextContent('Kitchen');
    expect(screen.getByText('Was due 22 November')).toBeInTheDocument();
    expect(screen.getByText('2 days late')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'How often' })).toHaveTextContent('Weekly');
    expect(screen.getByRole('region', { name: 'Who does it' })).toHaveTextContent('Anyone');
    expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('Not done yet');
    expect(screen.getByRole('link', { name: 'Back to Kitchen' })).toHaveAttribute(
      'href',
      '/room?id=room-kitchen',
    );
  });

  it('explains why and how for a job from the library', async () => {
    openJob('/job?id=job-oven', answersWithLibraryOven());
    const why = await screen.findByRole('region', { name: 'Why it matters' });
    expect(why).toHaveTextContent('Burnt-on grease smokes');
    const steps = within(screen.getByRole('region', { name: 'How to do it' })).getAllByRole(
      'listitem',
    );
    expect(steps).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'How often' })).toHaveTextContent(
      'Most homes do this every 3 months to every 6 months.',
    );
  });

  it.each([
    ['Mark as done', 'done'],
    ['Skip this time', 'skipped'],
  ])('records "%s" for today with one idempotency key', async (button, outcome) => {
    const client = await openOven({ [`POST ${OVEN_PATH}/completions`]: SAVED_PROGRESS });
    await userEvent.click(screen.getByRole('button', { name: button }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      outcome === 'done' ? 'Marked as done' : 'Skipped this time',
    );
    expect(keyedBodyOf(client, `POST ${OVEN_PATH}/completions`)).toEqual({
      outcome,
      completedOn: '2026-11-24',
    });
  });

  it('snoozes until the day picked', async () => {
    const client = await openOven({ [`POST ${OVEN_PATH}/snooze`]: SAVED_PROGRESS });
    await userEvent.click(screen.getByRole('button', { name: 'Snooze' }));
    const sheet = await screen.findByRole('dialog', { name: 'Snooze' });
    await userEvent.click(within(sheet).getByRole('button', { name: /In 3 days/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Snoozed until 27 November');
    expect(keyedBodyOf(client, `POST ${OVEN_PATH}/snooze`)).toEqual({ until: '2026-11-27' });
  });

  it('explains when marking it done does not save', async () => {
    await openOven({
      [`POST ${OVEN_PATH}/completions`]: () =>
        Promise.reject(new ApiRequestError('rejected', 'That job has been removed')),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That job has been removed');
  });

  it('renames the job, sending the version it was read at', async () => {
    const client = await openOven({
      [`PATCH ${OVEN_PATH}`]: () =>
        Promise.resolve({ ...TODAY_FIXTURE.jobs[0], name: 'Clean the oven racks', version: 2 }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const sheet = await screen.findByRole('dialog', { name: 'Rename job' });
    const name = within(sheet).getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Clean the oven racks');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(bodyOf(client, `PATCH ${OVEN_PATH}`)).toEqual({
      name: 'Clean the oven racks',
      version: 1,
    });
  });

  it('needs a name before renaming', async () => {
    const client = await openOven();
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const sheet = await screen.findByRole('dialog', { name: 'Rename job' });
    await userEvent.clear(within(sheet).getByRole('textbox', { name: 'Name' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(within(sheet).getByText('Enter a name for the job')).toBeInTheDocument();
    expect(client.calls).not.toContain(`PATCH ${OVEN_PATH}`);
  });

  it('asks before removing the job, then goes back to its room', async () => {
    const client = await openOven({ [`DELETE ${OVEN_PATH}`]: () => Promise.resolve(undefined) });
    await userEvent.click(screen.getByRole('button', { name: 'Remove job' }));
    const sheet = await screen.findByRole('dialog', { name: 'Remove this job?' });
    expect(client.calls).not.toContain(`DELETE ${OVEN_PATH}`);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/room?id=room-kitchen');
    });
    expect(client.calls).toContain(`DELETE ${OVEN_PATH}`);
  });

  it('keeps the job when removing is cancelled', async () => {
    const client = await openOven();
    await userEvent.click(screen.getByRole('button', { name: 'Remove job' }));
    const sheet = await screen.findByRole('dialog', { name: 'Remove this job?' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Keep it' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(client.calls).not.toContain(`DELETE ${OVEN_PATH}`);
  });

  it.each([
    ['a job that was removed', '/job?id=job-gone'],
    ['a link without a job', '/job'],
    ['a malformed id', '/job?id=../etc'],
  ])('explains %s', async (_case, address) => {
    openJob(address);
    expect(await screen.findByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See all rooms' })).toHaveAttribute('href', '/home');
  });

  it('explains when the job cannot be loaded', async () => {
    openJob('/job?id=job-oven', {
      ...homeAnswers(),
      [`GET ${HOME_PATH}/progress`]: () =>
        Promise.reject(new ApiRequestError('rejected', 'You’re not in that home any more')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re not in that home any more');
  });
});
