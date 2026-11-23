import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiRequestError } from '@/lib/api/api-client';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import type { FakeAnswers } from '@/test/fake-api-client';
import { HOME_PATH, homeAnswers } from '@/test/fake-home-answers';
import { JobPanel } from './job-panel';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/today',
}));

const NEVER = (): Promise<never> => new Promise(() => undefined);

function openPanel(
  jobId = 'job-oven',
  answers: FakeAnswers = homeAnswers(),
): { onClose: ReturnType<typeof vi.fn> } {
  const onClose = vi.fn();
  renderWithApi(<JobPanel jobId={jobId} onClose={onClose} />, clientAnswering(answers));
  return { onClose };
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

describe('JobPanel', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(
      <JobPanel jobId="job-oven" onClose={vi.fn()} />,
      clientAnswering(homeAnswers()),
    );
    await screen.findByRole('heading', { name: 'Clean the oven', level: 2 });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says it is getting the job while it loads', () => {
    openPanel('job-oven', { ...homeAnswers(), [`GET ${HOME_PATH}/jobs`]: NEVER });
    expect(screen.getByRole('status')).toHaveTextContent('Getting the job…');
  });

  it("shows the job's details under its name and room, with focus on its name", async () => {
    openPanel();
    const heading = await screen.findByRole('heading', { name: 'Clean the oven', level: 2 });
    expect(screen.getByText('Kitchen', { selector: 'header p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How often' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
  });

  it('closes with its Close button and with Escape', async () => {
    const { onClose } = openPanel();
    await screen.findByRole('heading', { name: 'Clean the oven', level: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('leaves Escape to a sheet opened from it', async () => {
    const { onClose } = openPanel();
    await screen.findByRole('heading', { name: 'Clean the oven', level: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const sheet = await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(sheet).not.toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("says when the job isn't here any more, and still closes", async () => {
    const { onClose } = openPanel('job-gone');
    const heading = await screen.findByRole('heading', {
      name: 'This job isn’t here any more',
      level: 2,
    });
    expect(heading).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('says what went wrong and tries again', async () => {
    let attempts = 0;
    openPanel('job-oven', {
      ...homeAnswers(),
      [`GET ${HOME_PATH}/jobs`]: () => {
        attempts += 1;
        if (attempts === 1) return Promise.reject(new ApiRequestError('rejected', 'Not now'));
        return homeAnswers()[`GET ${HOME_PATH}/jobs`]?.() ?? NEVER();
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Not now');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Clean the oven', level: 2 }),
    ).toBeInTheDocument();
  });

  it('closes after the job is removed', async () => {
    const { onClose } = openPanel('job-oven', {
      ...homeAnswers(),
      [`DELETE ${HOME_PATH}/jobs/job-oven`]: () => Promise.resolve(undefined),
    });
    await screen.findByRole('heading', { name: 'Clean the oven', level: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Remove job' }));
    const sheet = await screen.findByRole('dialog');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Remove' }));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(router.replace).not.toHaveBeenCalled();
  });
});
