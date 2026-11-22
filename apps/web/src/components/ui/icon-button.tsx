import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type IconButtonTone = 'plain' | 'solid';

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  label: string;
  icon: ReactNode;
  tone?: IconButtonTone;
}

const TONE_CLASSES: Record<IconButtonTone, string> = {
  plain: 'bg-card text-ink',
  solid: 'bg-ink text-card shadow-hard-accent',
};

export function IconButton({
  label,
  icon,
  tone = 'plain',
  className,
  type = 'button',
  ...buttonProps
}: IconButtonProps): ReactNode {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-control border-2 border-ink transition-transform motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50',
        TONE_CLASSES[tone],
        className,
      )}
      {...buttonProps}
    >
      {icon}
    </button>
  );
}
