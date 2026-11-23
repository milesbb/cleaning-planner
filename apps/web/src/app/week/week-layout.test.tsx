import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import { pretendTheScreenIs } from '@/test/screen-width';
import { WeekScreen } from './week-screen';
import { openWeek, weekAnswers } from './week-test-support';

vi.mock('next/navigation', () => ({
  useRouter: (): object => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: (): string => '/week',
}));

const HINT = "Choose a job to see when it's due, who does it and how.";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T09:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('This week on a laptop', () => {
  beforeEach(() => {
    pretendTheScreenIs('laptop');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(<WeekScreen />, clientAnswering(weekAnswers()));
    await screen.findByText(HINT);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps the days and Coming up together, with a hint beside them', async () => {
    openWeek();
    const comingUp = await screen.findByRole('heading', { name: 'Coming up' });
    const details = screen.getByRole('region', { name: 'Job details' });
    expect(await within(details).findByText(HINT)).toBeInTheDocument();
    expect(details).not.toContainElement(comingUp);
    expect(details).not.toContainElement(screen.getByRole('list', { name: 'Days' }));
  });
});

describe('This week on a phone', () => {
  beforeEach(() => {
    pretendTheScreenIs('phone');
  });

  it('leaves the hint out', async () => {
    openWeek();
    await screen.findByRole('heading', { name: 'Coming up' });
    expect(screen.queryByRole('region', { name: 'Job details' })).not.toBeInTheDocument();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });
});
