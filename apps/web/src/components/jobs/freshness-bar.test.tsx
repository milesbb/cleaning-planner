import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { FreshnessBar } from './freshness-bar';

describe('FreshnessBar', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<FreshnessBar level={0.4} label="Fresh for about 4 more days" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('reads out how fresh the job is', () => {
    render(<FreshnessBar level={0.4} label="Fresh for about 4 more days" />);
    const meter = screen.getByRole('meter', { name: 'Freshness' });
    expect(meter).toHaveAttribute('aria-valuenow', '40');
    expect(meter).toHaveAttribute('aria-valuetext', 'Fresh for about 4 more days');
  });

  it.each([
    [1, 'w-full'],
    [0.55, 'w-[60%]'],
    [0.04, 'w-0'],
    [0, 'w-0'],
  ])('fills a level of %s to the nearest tenth', (level, widthClass) => {
    render(<FreshnessBar level={level} label="Fresh" />);
    expect(screen.getByTestId('freshness-fill')).toHaveClass(widthClass);
  });

  it('stays calm when the job is due: the same colour, just empty', () => {
    render(<FreshnessBar level={0} label="Ready for a clean" />);
    expect(screen.getByTestId('freshness-fill')).toHaveClass('bg-done');
    expect(screen.getByRole('meter')).not.toHaveClass('bg-late');
  });
});
