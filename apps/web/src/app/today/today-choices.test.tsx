import { fireEvent, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { HOME, NEVER, homeAnswers, openToday, section } from './today-test-support';

vi.mock('next/navigation', () => ({
  useRouter: (): { push: () => void; replace: () => void } => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: (): string => '/today',
}));

const SKIP_HOB = `POST ${HOME}/jobs/job-hob/completions`;
const SNOOZE_HOB = `POST ${HOME}/jobs/job-hob/snooze`;
const SKIP_OVEN = `POST ${HOME}/jobs/job-oven/completions`;

async function chooseFromMore(jobName: string, choice: string): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: `More for ${jobName}` }));
  await userEvent.click(await screen.findByRole('button', { name: choice }));
}

function swipeLeft(element: HTMLElement): void {
  const touch = { pointerType: 'touch', clientY: 100 };
  fireEvent.pointerDown(element, { ...touch, clientX: 300 });
  fireEvent.pointerMove(element, { ...touch, clientX: 250 });
  fireEvent.pointerMove(element, { ...touch, clientX: 150 });
  fireEvent.pointerUp(element, { ...touch, clientX: 150 });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('Today’s snooze and skip', () => {
  it('has no accessibility violations with a job’s choices open', async () => {
    openToday();
    await userEvent.click(await screen.findByRole('button', { name: 'More for Wipe the hob' }));
    expect(await screen.findByRole('dialog', { name: 'Wipe the hob' })).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('offers More on due jobs only', async () => {
    openToday();
    await screen.findByRole('button', { name: 'More for Clean the oven' });
    expect(within(section('Today')).getAllByRole('button', { name: /^More for/ })).toHaveLength(2);
    expect(within(section('Tomorrow')).queryByRole('button', { name: /^More for/ })).toBeNull();
    expect(within(section('Done today')).queryByRole('button', { name: /^More for/ })).toBeNull();
  });

  it('snoozes a job to tomorrow at once, before the server answers', async () => {
    const client = openToday({ ...homeAnswers(), [SNOOZE_HOB]: NEVER });
    await chooseFromMore('Wipe the hob', 'Snooze a day');
    expect(within(section('Today')).queryByText('Wipe the hob')).not.toBeInTheDocument();
    expect(within(section('Tomorrow')).getByText('Wipe the hob')).toBeInTheDocument();
    expect(client.calls).toContain(SNOOZE_HOB);
    expect(client.bodies.at(-1)).toMatchObject({ until: '2026-11-25' });
    expect(client.bodies.at(-1)).toHaveProperty('idempotencyKey');
  });

  it('skips a job at once without calling it done', async () => {
    const client = openToday({ ...homeAnswers(), [SKIP_HOB]: NEVER });
    await chooseFromMore('Wipe the hob', 'Skip');
    expect(within(section('Today')).queryByText('Wipe the hob')).not.toBeInTheDocument();
    expect(within(section('Done today')).queryByText('Wipe the hob')).not.toBeInTheDocument();
    expect(client.bodies.at(-1)).toMatchObject({ outcome: 'skipped', completedOn: '2026-11-24' });
  });

  it('skips a late job', async () => {
    const client = openToday({ ...homeAnswers(), [SKIP_OVEN]: NEVER });
    await chooseFromMore('Clean the oven', 'Skip');
    expect(screen.queryByRole('region', { name: 'Late' })).not.toBeInTheDocument();
    expect(client.calls).toContain(SKIP_OVEN);
  });

  it('puts the job back and says why when a snooze is refused', async () => {
    openToday({
      ...homeAnswers(),
      [SNOOZE_HOB]: () =>
        Promise.reject(
          new ApiRequestError('rejected', 'That job was deleted', { code: 'notFound' }),
        ),
    });
    await chooseFromMore('Wipe the hob', 'Snooze a day');
    expect(await screen.findByRole('alert')).toHaveTextContent('That job was deleted');
    expect(within(section('Today')).getByText('Wipe the hob')).toBeInTheDocument();
  });

  it('skips with a swipe on touch', async () => {
    const client = openToday({ ...homeAnswers(), [SKIP_HOB]: NEVER });
    swipeLeft(await screen.findByRole('link', { name: /Wipe the hob/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(within(section('Today')).queryByText('Wipe the hob')).not.toBeInTheDocument();
    expect(client.calls).toContain(SKIP_HOB);
  });
});
