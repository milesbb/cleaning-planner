import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import WelcomePage from './page';

describe('Welcome', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<WelcomePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says what the app is for and offers both ways in', () => {
    render(<WelcomePage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Know what needs cleaning, and when.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/sign-in');
  });
});
