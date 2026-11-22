import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { hasErrors, useFields } from './use-fields';

function EmailField(): ReactNode {
  const fields = useFields({ email: '' });
  const { value, onChange, error } = fields.bind('email');
  return (
    <>
      <input aria-label="Email" value={value} onChange={onChange} />
      <button
        type="button"
        onClick={() => {
          fields.setErrors({ email: 'Enter your email' });
        }}
      >
        Check
      </button>
      <p>{`${fields.values.email}|${error ?? 'no error'}`}</p>
    </>
  );
}

describe('useFields', () => {
  it('binds each field’s value, error and change handler', async () => {
    render(<EmailField />);
    await userEvent.type(screen.getByLabelText('Email'), 'sam@example.com');
    expect(screen.getByText('sam@example.com|no error')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('sam@example.com|Enter your email')).toBeInTheDocument();
  });

  it('knows when any field has an error', () => {
    expect(hasErrors({ email: undefined, password: 'Enter your password' })).toBe(true);
    expect(hasErrors({ email: undefined })).toBe(false);
  });
});
