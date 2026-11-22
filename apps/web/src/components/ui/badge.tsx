import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'late' | 'done' | 'recommended' | 'owner';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-card',
  late: 'bg-late',
  done: 'bg-done',
  recommended: 'bg-done',
  owner: 'bg-kitchen',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-bold text-ink',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
