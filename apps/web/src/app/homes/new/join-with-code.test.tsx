import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { JoinWithCode } from './join-with-code';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: (): typeof router => router }));

afterEach(() => {
  vi.clearAllMocks();
});

async function join(code: string): Promise<void> {
  if (code !== '') await userEvent.type(screen.getByLabelText('Invite code'), code);
  await userEvent.click(screen.getByRole('button', { name: 'Join' }));
}

describe('JoinWithCode', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<JoinWithCode />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('takes a code typed any way and opens that invite', async () => {
    render(<JoinWithCode />);
    expect(screen.getByLabelText('Invite code')).toHaveAttribute('autocapitalize', 'characters');
    await join(' 7k3m9qza ');
    expect(router.push).toHaveBeenCalledWith('/join?code=7K3M9QZA');
  });

  it('explains a code that cannot be right, and stays put', async () => {
    render(<JoinWithCode />);
    await join('7K3M');
    expect(screen.getByLabelText('Invite code')).toHaveAccessibleDescription(
      /Enter the 8-character code from your invite/,
    );
    expect(screen.getByLabelText('Invite code')).toHaveFocus();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('asks for a code when the field is empty', async () => {
    render(<JoinWithCode />);
    await join('');
    expect(screen.getByLabelText('Invite code')).toHaveAttribute('aria-invalid', 'true');
  });
});
