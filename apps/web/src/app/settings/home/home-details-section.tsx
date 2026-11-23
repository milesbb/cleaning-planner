'use client';

import type { Household } from '@cleaning-planner/contracts/household';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/section-heading';
import { HomeDetailsSheet, weekdayName } from './home-details-sheet';

interface HomeDetailsSectionProps {
  household: Household;
  isOwner: boolean;
}

export function HomeDetailsSection({ household, isOwner }: HomeDetailsSectionProps): ReactNode {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <SectionHeading id={headingId}>Home details</SectionHeading>
      <Card raised={false} className="flex flex-col gap-1">
        <p>Week starts on {weekdayName(household.weekStartsOn)}</p>
        <p>Time zone: {household.timeZone}</p>
        {isOwner ? <HomeDetailsSheet household={household} /> : null}
      </Card>
    </section>
  );
}
