import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AppGuide } from './app-guide';

describe('AppGuide', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<AppGuide />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('explains each part of the app under its own heading', () => {
    render(<AppGuide />);
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      'Today',
      'Not today?',
      'This week',
      'Home and rooms',
      'Each job',
      'When jobs come round',
      'Share your home',
      'Keep it on your phone',
    ]);
  });

  it('tells you how to tick off, snooze and skip a job', () => {
    render(<AppGuide />);
    const topics = screen.getAllByRole('listitem');
    expect(within(topics[0] ?? document.body).getByText(/Tap the tick/)).toBeInTheDocument();
    expect(
      within(topics[1] ?? document.body).getByText(/snooze it to a later day/),
    ).toBeInTheDocument();
    expect(within(topics[1] ?? document.body).getByText(/skip it this time/)).toBeInTheDocument();
  });

  it('says where to invite the people you live with', () => {
    render(<AppGuide />);
    expect(
      screen.getByText(/Settings, then Home settings, then Invite someone/),
    ).toBeInTheDocument();
  });
});
