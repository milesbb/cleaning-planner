import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { CheckIcon } from '../icons/interface-icons';
import { Avatar, type PersonColour } from './avatar';
import { Badge, type BadgeTone } from './badge';
import { Card } from './card';
import { SectionHeading } from './section-heading';

describe('display pieces', () => {
  it('have no accessibility violations together', async () => {
    const { container } = render(
      <Card>
        <SectionHeading>Late</SectionHeading>
        <Badge tone="late">2 days late</Badge>
        <Avatar name="Alex" colour="pink" announced />
      </Card>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Card', () => {
  it('has the hard shadow unless it sits flat', () => {
    const { rerender, container } = render(<Card>Raised</Card>);
    expect(container.firstChild).toHaveClass('shadow-hard', 'border-ink', 'rounded-card');
    rerender(<Card raised={false}>Flat</Card>);
    expect(container.firstChild).not.toHaveClass('shadow-hard');
  });
});

describe('Badge', () => {
  it.each([
    ['late', 'bg-late'],
    ['done', 'bg-done'],
    ['recommended', 'bg-done'],
    ['owner', 'bg-kitchen'],
    ['neutral', 'bg-card'],
  ] satisfies [BadgeTone, string][])('shows the %s tone', (tone, expectedClass) => {
    render(<Badge tone={tone}>Label</Badge>);
    expect(screen.getByText('Label')).toHaveClass(expectedClass);
  });

  it('can carry an icon', () => {
    const { container } = render(<Badge icon={<CheckIcon size={14} />}>Recommended</Badge>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('shows the first letter of the name', () => {
    render(<Avatar name=" sam" colour="blue" announced />);
    expect(screen.getByRole('img', { name: 'sam' })).toHaveTextContent('S');
  });

  it('is hidden from screen readers when the name is already written next to it', () => {
    const { container } = render(<Avatar name="Sam" colour="blue" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    ['blue', 'bg-laundry'],
    ['pink', 'bg-bedroom'],
    ['green', 'bg-living-room'],
    ['yellow', 'bg-kitchen'],
    ['teal', 'bg-bathroom'],
  ] satisfies [PersonColour, string][])('uses %s as a person colour', (colour, expectedClass) => {
    const { container } = render(<Avatar name="Jo" colour={colour} />);
    expect(container.firstChild).toHaveClass(expectedClass);
  });
});

describe('SectionHeading', () => {
  it('is a level 2 heading by default and level 3 when asked', () => {
    render(
      <>
        <SectionHeading>Today</SectionHeading>
        <SectionHeading level={3}>Tomorrow</SectionHeading>
      </>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tomorrow' })).toBeInTheDocument();
  });
});
