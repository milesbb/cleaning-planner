import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Button } from '../ui/button';
import {
  AccountForm,
  AccountHeading,
  AccountScreen,
  AppNameRow,
  FormAlert,
  FormStatus,
} from './account-screen';

describe('AccountScreen', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AccountScreen back={{ href: '/welcome', label: 'Back' }}>
        <AccountHeading title="Welcome back">Log in to see what needs doing.</AccountHeading>
        <AccountForm onSubmit={() => true} actions={<Button type="submit">Log in</Button>}>
          <FormAlert>That didn’t work.</FormAlert>
          <FormStatus>We’ve sent a new code.</FormStatus>
        </AccountForm>
      </AccountScreen>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is the page’s main landmark, with a back link and one heading', () => {
    render(
      <AccountScreen back={{ href: '/welcome', label: 'Back' }}>
        <AccountHeading title="Welcome back">Log in.</AccountHeading>
      </AccountScreen>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/welcome');
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
  });

  it('reads out errors and status messages as they appear', () => {
    render(
      <>
        <FormAlert>That code doesn’t match.</FormAlert>
        <FormStatus>We’ve sent a new code.</FormStatus>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('That code doesn’t match.');
    expect(screen.getByRole('status')).toHaveTextContent('We’ve sent a new code.');
  });

  it('shows the app name with its mark', () => {
    render(<AppNameRow />);
    expect(screen.getByText('Cleaning Planner')).toBeInTheDocument();
  });
});
