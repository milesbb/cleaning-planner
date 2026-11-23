import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { JobRow } from './job-row';

const WIPE_THE_HOB = {
  name: 'Wipe the hob',
  room: 'kitchen',
  icon: 'spray',
  meta: 'Kitchen · Anyone · 5 min',
  href: '/job?id=job-hob',
} as const;

function DueRowWithMore(): ReactNode {
  return (
    <JobRow
      {...WIPE_THE_HOB}
      more={<button type="button">More for Wipe the hob</button>}
      status={{ kind: 'due', onDone: vi.fn() }}
    />
  );
}

describe('JobRow with More', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<DueRowWithMore />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('puts the extra button before the done button', () => {
    render(<DueRowWithMore />);
    const buttonNames = screen
      .getAllByRole('button')
      .map((button) => button.textContent || button.getAttribute('aria-label'));
    expect(buttonNames).toEqual(['More for Wipe the hob', 'Mark Wipe the hob as done']);
  });
});
