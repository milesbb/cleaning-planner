import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'dashed' | 'danger';

const BASE_CLASSES =
  'inline-flex min-h-14 items-center justify-center gap-2 rounded-control border-2 border-ink px-5 text-lg font-bold text-ink no-underline transition-transform motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-none';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-card shadow-hard-accent',
  secondary: 'bg-card shadow-hard',
  dashed: 'border-dashed bg-transparent',
  danger: 'bg-danger shadow-hard',
};

function buttonClasses(variant: ButtonVariant, extraClasses?: string): string {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], extraClasses);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...buttonProps
}: ButtonProps): ReactNode {
  return <button type={type} className={buttonClasses(variant, className)} {...buttonProps} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...linkProps
}: ButtonLinkProps): ReactNode {
  return <Link className={buttonClasses(variant, className)} {...linkProps} />;
}
