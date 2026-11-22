import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  children: ReactNode;
  level?: 2 | 3;
  className?: string;
}

export function SectionHeading({ children, level = 2, className }: SectionHeadingProps): ReactNode {
  const HeadingTag = level === 2 ? 'h2' : 'h3';
  return (
    <HeadingTag
      className={cn(
        'flex items-center gap-2 font-display text-[0.9375rem] font-extrabold uppercase tracking-[0.1em]',
        className,
      )}
    >
      {children}
    </HeadingTag>
  );
}
