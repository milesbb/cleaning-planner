import { useId } from 'react';
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/ui/section-heading';

// One titled part of Job detail, named by its heading for screen readers.
export function JobFact({ title, children }: { title: string; children: ReactNode }): ReactNode {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1.5">
      <SectionHeading id={headingId}>{title}</SectionHeading>
      {children}
    </section>
  );
}
