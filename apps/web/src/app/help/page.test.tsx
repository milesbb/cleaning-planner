import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import HelpPage from './page';

describe('Help', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<HelpPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is its own tab in the main menu, explaining how the app works', () => {
    render(<HelpPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 2, name: 'Today' })).toBeInTheDocument();
  });
});
