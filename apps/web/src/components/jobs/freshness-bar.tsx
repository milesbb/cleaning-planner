import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const PERCENT = 100;
const STEPS = 10;

// Tailwind only sees whole class names, so the fill moves in tenths.
const WIDTH_BY_TENTH = [
  'w-0',
  'w-[10%]',
  'w-[20%]',
  'w-[30%]',
  'w-[40%]',
  'w-[50%]',
  'w-[60%]',
  'w-[70%]',
  'w-[80%]',
  'w-[90%]',
  'w-full',
] as const;

interface FreshnessBarProps {
  // 1 just done, 0 due (from `freshness` in @cleaning-planner/schedule).
  level: number;
  label: string;
  className?: string;
}

// How fresh a repeat-after-done job is. Calm on purpose: a due job's bar is
// simply empty, never red.
export function FreshnessBar({ level, label, className }: FreshnessBarProps): ReactNode {
  const tenths = Math.round(level * STEPS);
  return (
    <div
      role="meter"
      aria-label="Freshness"
      aria-valuemin={0}
      aria-valuemax={PERCENT}
      aria-valuenow={Math.round(level * PERCENT)}
      aria-valuetext={label}
      className={cn('h-2 w-full overflow-hidden rounded-full border border-ink bg-card', className)}
    >
      <div
        data-testid="freshness-fill"
        className={cn('h-full bg-done', WIDTH_BY_TENTH[tenths] ?? 'w-0')}
      />
    </div>
  );
}
