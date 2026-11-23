import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithAuth, stubAccountAuth } from '@/test/account-auth-stub';
import { NotFoundScreen } from './not-found-screen';

describe('NotFoundScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithAuth(<NotFoundScreen />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says calmly that the page is not there', () => {
    renderWithAuth(<NotFoundScreen />);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t find that page', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/The link may be old or mistyped\./)).toBeInTheDocument();
  });

  it('leads back to Today when this browser might be signed in', () => {
    renderWithAuth(<NotFoundScreen />, stubAccountAuth({ mightBeSignedIn: () => true }));
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/today');
  });

  it('leads back to the start when it is not', () => {
    renderWithAuth(<NotFoundScreen />, stubAccountAuth({ mightBeSignedIn: () => false }));
    expect(screen.getByRole('link', { name: 'Go to the start' })).toHaveAttribute(
      'href',
      '/welcome',
    );
  });
});
