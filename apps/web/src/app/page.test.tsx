import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import HomePage from './page';

describe('HomePage', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<HomePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the Today heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument();
  });

  it('explains that there are no tasks yet', () => {
    render(<HomePage />);
    expect(screen.getByText(/no cleaning tasks yet/i)).toBeInTheDocument();
  });

  it('shows an example task with its next due date from the schedule engine', () => {
    render(<HomePage />);
    const example = screen.getByRole('region', { name: 'Example task' });
    expect(example).toHaveTextContent('Washing machine maintenance wash');
    expect(example).toHaveTextContent('Next due 1 December 2026');
  });
});
