import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Button, ButtonLink, type ButtonVariant } from './button';

const variants: ButtonVariant[] = ['primary', 'secondary', 'dashed', 'danger'];

describe('Button', () => {
  it('has no accessibility violations in any variant', async () => {
    const { container } = render(
      <div>
        {variants.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <ButtonLink href="/today">Go to today</ButtonLink>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is a plain button that does not submit forms unless asked', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Done</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does nothing when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Done
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([
    ['primary', 'bg-ink'],
    ['secondary', 'bg-card'],
    ['dashed', 'border-dashed'],
    ['danger', 'bg-danger'],
  ] satisfies [ButtonVariant, string][])('styles the %s variant', (variant, expectedClass) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass(expectedClass, 'min-h-14');
  });

  it('can be a form submit button', () => {
    render(<Button type="submit">Log in</Button>);
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveAttribute('type', 'submit');
  });
});

describe('ButtonLink', () => {
  it('is a link that looks like a button', () => {
    render(
      <ButtonLink href="/sign-up" variant="secondary">
        Create an account
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Create an account' });
    expect(link).toHaveAttribute('href', '/sign-up');
    expect(link).toHaveClass('bg-card', 'min-h-14');
  });
});
