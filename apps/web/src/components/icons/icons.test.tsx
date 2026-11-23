import { JOB_ICON_KEYS } from '@cleaning-planner/schedule/library/keys';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import type { IconComponent } from './create-icon';
import * as interfaceIcons from './interface-icons';
import { JOB_ICONS, JobIcon } from './job-icons';

const interfaceIconEntries = Object.entries(interfaceIcons).filter(
  (entry): entry is [string, IconComponent] => typeof entry[1] === 'function',
);

describe('icons', () => {
  it('has no accessibility violations, decorative or labelled', async () => {
    const { container } = render(
      <div>
        <interfaceIcons.CheckIcon />
        <interfaceIcons.BellIcon label="Reminders" />
        <JobIcon icon="washer" label="Washing machine" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('hides decorative icons from screen readers', () => {
    const { container } = render(<interfaceIcons.CheckIcon />);
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('focusable', 'false');
  });

  it('names an icon that carries meaning', () => {
    render(<interfaceIcons.BellIcon label="Reminders" />);
    expect(screen.getByRole('img', { name: 'Reminders' })).toBeInTheDocument();
  });

  it('draws with the current text colour at the size asked for', () => {
    const { container } = render(<interfaceIcons.PlusIcon size={30} strokeWidth={2.5} />);
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('stroke', 'currentColor');
    expect(icon).toHaveAttribute('width', '30');
    expect(icon).toHaveAttribute('stroke-width', '2.5');
  });

  it.each(interfaceIconEntries)('%s draws at least one shape', (_, Icon) => {
    const { container } = render(<Icon />);
    expect(container.querySelector('svg')?.childElementCount).toBeGreaterThan(0);
  });
});

describe('JobIcon', () => {
  it('has an icon for every job icon key in the library', () => {
    expect(Object.keys(JOB_ICONS).sort()).toEqual([...JOB_ICON_KEYS].sort());
  });

  it.each(JOB_ICON_KEYS)('draws the %s icon', (iconKey) => {
    const { container } = render(<JobIcon icon={iconKey} />);
    expect(container.querySelector('svg')?.childElementCount).toBeGreaterThan(0);
  });

  it('passes its label on to the icon', () => {
    render(<JobIcon icon="dishwasher" label="Dishwasher" size={28} />);
    expect(screen.getByRole('img', { name: 'Dishwasher' })).toHaveAttribute('width', '28');
  });
});
