import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import StartOrJoinPage from './page';

vi.mock('next/navigation', () => ({ useRouter: (): object => ({ push: vi.fn() }) }));

describe('Start or join a home', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<StartOrJoinPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers to start a new home or join one with a code', () => {
    render(<StartOrJoinPage />);
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
});
