import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { fakeScreenOf, restoreScreen } from '@/test/fake-screen';
import { RoomScreen } from './room-screen';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/room',
}));

function openRoom(address: string, answers: FakeAnswers = homeAnswers()): void {
  window.history.replaceState(null, '', address);
  renderWithApi(<RoomScreen />, clientAnswering(answers));
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
  restoreScreen();
});

describe('RoomScreen', () => {
  it('has no accessibility violations', async () => {
    window.history.replaceState(null, '', '/room?id=room-kitchen');
    const { container } = renderWithApi(<RoomScreen />, clientAnswering(homeAnswers()));
    await screen.findByRole('heading', { name: 'Kitchen', level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the room while it loads', () => {
    openRoom('/room?id=room-kitchen', {
      ...homeAnswers(),
      [`GET ${HOME_PATH}/jobs`]: () => new Promise(() => undefined),
    });
    expect(screen.getByRole('status')).toHaveTextContent('Getting the room');
  });

  it('lists the room’s jobs soonest first, with how often, who and when', async () => {
    openRoom('/room?id=room-kitchen');
    expect(await screen.findByText('3 jobs')).toBeInTheDocument();
    const jobs = within(screen.getByRole('list', { name: 'Jobs in Kitchen' })).getAllByRole(
      'listitem',
    );
    expect(jobs.map((job) => job.textContent)).toEqual([
      expect.stringContaining('Clean the oven'),
      expect.stringContaining('Wipe the hob'),
      expect.stringContaining('Empty the bins'),
    ]);
    expect(screen.getByText('Weekly · Anyone · was due 22 November')).toBeInTheDocument();
    expect(screen.getByText('2 days late')).toBeInTheDocument();
    expect(screen.getByText('Weekly · Anyone · next 27 November')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/home');
    expect(screen.getByRole('link', { name: 'Add a job' })).toHaveAttribute(
      'href',
      '/room/add?id=room-kitchen',
    );
    expect(screen.getByRole('link', { name: /Clean the oven/ })).toHaveAttribute(
      'href',
      '/job?id=job-oven',
    );
  });

  it('shows how fresh each repeat-after-done job is, calmly once it is due', async () => {
    openRoom('/room?id=room-kitchen');
    const jobs = within(await screen.findByRole('list', { name: 'Jobs in Kitchen' })).getAllByRole(
      'listitem',
    );
    const freshnessOf = (index: number): string | null =>
      within(jobs[index] ?? document.body)
        .getByRole('meter', { name: 'Freshness' })
        .getAttribute('aria-valuetext');
    expect(freshnessOf(0)).toBe('Ready for a clean');
    expect(freshnessOf(1)).toBe('Ready for a clean');
    expect(freshnessOf(2)).toBe('Fresh for about 3 more days');
  });

  it('says when a room has no jobs yet', async () => {
    openRoom('/room?id=room-bed', {
      ...homeAnswers(),
      [`GET ${HOME_PATH}/jobs`]: () => Promise.resolve([]),
    });
    expect(await screen.findByText('No jobs in this room yet.')).toBeInTheDocument();
  });

  it.each([
    ['a room that was removed', '/room?id=room-gone'],
    ['a link without a room', '/room'],
    ['a malformed id', '/room?id=../etc'],
  ])('explains %s', async (_case, address) => {
    openRoom(address);
    expect(await screen.findByRole('heading', { name: 'Room not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See all rooms' })).toHaveAttribute('href', '/home');
  });

  it('explains when the room cannot be loaded', async () => {
    openRoom('/room?id=room-kitchen', {
      ...homeAnswers(),
      [`GET ${HOME_PATH}/progress`]: () =>
        Promise.reject(new ApiRequestError('rejected', 'You’re not in that home any more')),
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('You’re not in that home any more');
  });

  it('offers to show a job beside the list on a laptop', async () => {
    fakeScreenOf(true);
    openRoom('/room?id=room-kitchen');
    const details = await screen.findByRole('region', { name: 'Job details' });
    expect(details).toHaveTextContent("Choose a job to see when it's due, who does it and how.");
  });

  it('leaves the job hint out on phones and tablets', async () => {
    openRoom('/room?id=room-kitchen');
    await screen.findByRole('list', { name: 'Jobs in Kitchen' });
    expect(screen.queryByRole('region', { name: 'Job details' })).not.toBeInTheDocument();
  });
});
