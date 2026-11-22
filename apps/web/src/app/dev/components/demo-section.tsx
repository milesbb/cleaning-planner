import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/ui/section-heading';

interface DemoSectionProps {
  title: string;
  children: ReactNode;
}

export function DemoSection({ title, children }: DemoSectionProps): ReactNode {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}
