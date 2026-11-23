import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MouseEvent, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import { homeAnswers } from '@/test/fake-home-answers';
import { pretendTheScreenIs } from '@/test/screen-width';
import { TwoColumns } from './two-columns';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: (): typeof router => router,
  usePathname: (): string => '/today',
}));

const OVEN = { level: 2, name: 'Clean the oven' } as const;

// Next.js's Link stops the browser's own navigation in the same way.
function stayOnPage(event: MouseEvent): void {
  event.preventDefault();
}

function ListOfJobs(): ReactNode {
  return (
    <>
      <h1 tabIndex={-1}>Today</h1>
      <a href="/job?id=job-oven" onClick={stayOnPage}>
        Clean the oven
      </a>
      <a href="/job/?id=job-hob" onClick={stayOnPage}>
        Wipe the hob
      </a>
      <a href="/week" onClick={stayOnPage}>
        See the week
      </a>
    </>
  );
}

function openList(address = '/today'): void {
  window.history.replaceState(null, '', address);
  renderWithApi(
    <TwoColumns main={<ListOfJobs />} side={<p>The week</p>} sideLabel="This week" />,
    clientAnswering(homeAnswers()),
  );
}

function jobInAddress(): string | null {
  return new URLSearchParams(window.location.search).get('job');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

describe('TwoColumns opening jobs on a laptop', () => {
  beforeEach(() => {
    pretendTheScreenIs('laptop');
  });

  it('has no accessibility violations with a job open', async () => {
    window.history.replaceState(null, '', '/today?job=job-oven');
    const { container } = renderWithApi(
      <TwoColumns main={<ListOfJobs />} side={<p>The week</p>} sideLabel="This week" />,
      clientAnswering(homeAnswers()),
    );
    await screen.findByRole('heading', OVEN);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens a job beside the list, keeping the list', async () => {
    openList();
    await userEvent.click(screen.getByRole('link', { name: 'Clean the oven' }));
    expect(jobInAddress()).toBe('job-oven');
    const details = screen.getByRole('region', { name: 'Job details' });
    expect(await screen.findByRole('heading', OVEN)).toBeInTheDocument();
    expect(details).not.toHaveTextContent('The week');
    expect(screen.getByRole('link', { name: 'Wipe the hob' })).toBeInTheDocument();
  });

  it('replaces the open job rather than adding to the history', async () => {
    openList();
    await userEvent.click(screen.getByRole('link', { name: 'Clean the oven' }));
    const entries = window.history.length;
    await userEvent.click(screen.getByRole('link', { name: 'Wipe the hob' }));
    expect(jobInAddress()).toBe('job-hob');
    expect(window.history.length).toBe(entries);
  });

  it('leaves other links, and clicks meant for a new tab, alone', async () => {
    openList();
    await userEvent.click(screen.getByRole('link', { name: 'See the week' }));
    fireEvent.click(screen.getByRole('link', { name: 'Clean the oven' }), { ctrlKey: true });
    expect(jobInAddress()).toBeNull();
    expect(screen.getByRole('region', { name: 'This week' })).toHaveTextContent('The week');
  });

  it("closes from the panel, giving focus back to the job's row", async () => {
    openList('/today?job=job-oven');
    await screen.findByRole('heading', OVEN);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(jobInAddress()).toBeNull();
    expect(screen.getByRole('region', { name: 'This week' })).toHaveTextContent('The week');
    expect(screen.getByRole('link', { name: 'Clean the oven' })).toHaveFocus();
  });

  it("gives focus to the page's heading when the job's row has gone", async () => {
    openList('/today?job=job-bins');
    await screen.findByRole('heading', { level: 2, name: 'Empty the bins' });
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toHaveFocus();
  });

  it('closes when Back leaves the job', async () => {
    openList('/today?job=job-oven');
    await screen.findByRole('heading', OVEN);
    act(() => {
      window.history.replaceState(null, '', '/today');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', OVEN)).not.toBeInTheDocument();
    });
  });
});

describe('TwoColumns with a job in the address below laptop width', () => {
  it("shows the job's own page instead", async () => {
    pretendTheScreenIs('phone');
    openList('/today?job=job-oven');
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/job?id=job-oven');
    });
  });

  it('leaves job links to open the page', async () => {
    pretendTheScreenIs('phone');
    openList();
    await userEvent.click(screen.getByRole('link', { name: 'Clean the oven' }));
    expect(jobInAddress()).toBeNull();
  });
});
