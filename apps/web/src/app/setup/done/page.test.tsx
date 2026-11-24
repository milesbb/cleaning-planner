import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import SetupDonePage from './page';

describe('Setup: done', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<SetupDonePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says the home is ready and explains how the app works', () => {
    render(<SetupDonePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'You’re all set' })).toBeInTheDocument();
    expect(screen.getByText(/find this again any time under Help/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Today' })).toBeInTheDocument();
  });

  it('goes on to Today', () => {
    render(<SetupDonePage />);
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/today');
  });
});
