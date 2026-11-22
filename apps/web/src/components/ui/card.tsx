import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export function Card({ raised = true, className, ...divProps }: CardProps): ReactNode {
  return (
    <div
      className={cn(
        'rounded-card border-2 border-ink bg-card p-4',
        raised && 'shadow-hard',
        className,
      )}
      {...divProps}
    />
  );
}
