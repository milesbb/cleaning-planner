import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { clientAnswering, renderWithApi } from '@/test/fake-api-client';
import StartOrJoinPage from './page';

vi.mock('next/navigation', () => ({ useRouter: (): object => ({ push: vi.fn() }) }));

const HOMES_ROUTE = 'GET /v1/households';

function openWithHomes(homes: unknown[]): void {
  renderWithApi(
    <StartOrJoinPage />,
    clientAnswering({ [HOMES_ROUTE]: () => Promise.resolve(homes) }),
  );
}

describe('Start or join a home', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithApi(
      <StartOrJoinPage />,
      clientAnswering({ [HOMES_ROUTE]: () => Promise.resolve([]) }),
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers to start a new home or join one with a code', () => {
    openWithHomes([]);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Let’s set up your home' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a new home' })).toHaveAttribute(
      'href',
      '/setup/rooms',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Join someone’s home' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Invite code')).toBeInTheDocument();
  });

  it('has no way back for someone with no home yet', async () => {
    openWithHomes([]);
    await screen.findByRole('heading', { level: 1, name: 'Let’s set up your home' });
    expect(screen.queryByRole('link', { name: 'Back to Today' })).not.toBeInTheDocument();
  });

  it('lets someone who already has a home add another, or go back to Today', async () => {
    openWithHomes([{ id: 'home-1', name: 'TestHome1', role: 'owner' }]);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Add another home' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/today');
    expect(screen.getByRole('link', { name: 'Start a new home' })).toBeInTheDocument();
  });
});
