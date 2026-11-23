import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon } from '../icons/interface-icons';

interface BackLinkProps {
  href: string;
  label: string;
}

export function BackLink({ href, label }: BackLinkProps): ReactNode {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-control border-2 border-ink bg-card text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <ChevronLeftIcon strokeWidth={2.6} />
    </Link>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, leading, action }: PageHeaderProps): ReactNode {
  const hasToolbar = leading !== undefined || action !== undefined;
  return (
    <header className="flex flex-col gap-4">
      {hasToolbar ? (
        <div
          className={cn('flex min-h-13 items-center gap-3', {
            'justify-between': leading !== undefined,
            'justify-end': leading === undefined,
          })}
        >
          {leading}
          {action}
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5">
        <h1
          tabIndex={-1}
          className="font-display focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink text-[2.375rem] leading-[2.75rem] font-extrabold tracking-[-0.0625rem] break-words sm:text-[2.875rem] sm:leading-[3.125rem]"
        >
          {title}
        </h1>
        {subtitle === undefined ? null : <p className="text-[0.9375rem]">{subtitle}</p>}
      </div>
    </header>
  );
}
