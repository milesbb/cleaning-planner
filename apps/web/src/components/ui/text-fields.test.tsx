import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { PasswordField } from './password-field';
import { TextField } from './text-field';

function ControlledPassword({ minimumLength }: { minimumLength?: number }): ReactNode {
  const [password, setPassword] = useState('');
  return (
    <PasswordField
      label="Password"
      autoComplete="new-password"
      value={password}
      onChange={(event) => {
        setPassword(event.target.value);
      }}
      {...(minimumLength === undefined ? {} : { minimumLength })}
    />
  );
}

describe('TextField', () => {
  it('has no accessibility violations with a hint and an error', async () => {
    const { container } = render(
      <form>
        <TextField label="Your name" hint="Shown to people you share a home with." />
        <TextField
          label="Email"
          type="email"
          error="Enter an email address like name@example.com"
        />
      </form>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is labelled and described by its hint', () => {
    render(<TextField label="Your name" hint="Shown to people you share a home with." />);
    expect(screen.getByLabelText('Your name')).toHaveAccessibleDescription(
      'Shown to people you share a home with.',
    );
  });

  it('marks itself invalid and reads out the error', () => {
    render(<TextField label="Email" error="Enter an email address" hint="We send a code" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We send a code Enter an email address');
  });

  it('passes input settings through for password managers and keyboards', () => {
    render(<TextField label="Email" type="email" autoComplete="username" inputMode="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('autocomplete', 'username');
    expect(input).toHaveAttribute('type', 'email');
  });
});

describe('PasswordField', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<ControlledPassword minimumLength={12} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('starts hidden and shows the password when asked', async () => {
    render(<ControlledPassword />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    const hideButton = screen.getByRole('button', { name: 'Hide password' });
    expect(hideButton).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(hideButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('tells the browser which kind of password it is, for password managers', () => {
    render(<PasswordField label="Current password" autoComplete="current-password" />);
    expect(screen.getByLabelText('Current password')).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
  });

  it('counts down to the minimum length, then says it is long enough', async () => {
    render(<ControlledPassword minimumLength={12} />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAccessibleDescription('At least 12 characters.');
    await userEvent.type(input, 'short one');
    expect(input).toHaveAccessibleDescription('3 more characters to go. At least 12 in total.');
    await userEvent.type(input, 'ab');
    expect(input).toHaveAccessibleDescription('1 more character to go. At least 12 in total.');
    await userEvent.type(input, 'c');
    expect(input).toHaveAccessibleDescription('12 characters. Long enough.');
  });

  it('shows an error instead of the hint when there is one', () => {
    render(
      <PasswordField
        label="Password"
        autoComplete="current-password"
        error="That email and password don't match."
      />,
    );
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      "That email and password don't match.",
    );
  });
});
