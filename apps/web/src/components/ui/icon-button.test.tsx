import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { PlusIcon } from '../icons/interface-icons';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <IconButton label="Add a job" icon={<PlusIcon />} tone="solid" />
        <IconButton label="Back" icon={<PlusIcon />} />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is named by its label, not its icon', () => {
    render(<IconButton label="Add a job" icon={<PlusIcon />} />);
    expect(screen.getByRole('button', { name: 'Add a job' })).toBeInTheDocument();
  });

  it('is at least 44px square', () => {
    render(<IconButton label="Add a job" icon={<PlusIcon />} />);
    expect(screen.getByRole('button', { name: 'Add a job' })).toHaveClass('size-12');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<IconButton label="Add a job" icon={<PlusIcon />} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add a job' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('cannot be used without a label', () => {
    // @ts-expect-error -- an icon-only button must have a label for screen readers
    const unlabelled = <IconButton icon={<PlusIcon />} />;
    expect(unlabelled).toBeDefined();
  });
});
