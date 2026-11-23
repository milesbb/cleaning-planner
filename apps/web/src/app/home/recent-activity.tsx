'use client';

import { lazy, useId } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/section-heading';
import { LazySheet } from '@/lib/lazy-sheet';
import type { ActivityPeople } from './activity-line';
import { ActivityStates } from './activity-states';
import { useActivity } from './use-activity';

const RECENT_ENTRIES = 10;

interface RecentActivityProps {
  householdId: string;
  people: ActivityPeople;
}

const AllActivitySheet = lazy(async () => ({
  default: (await import('./all-activity-sheet')).AllActivitySheet,
}));

export function RecentActivity({ householdId, people }: RecentActivityProps): ReactNode {
  const headingId = useId();
  const activity = useActivity(householdId, RECENT_ENTRIES);
  const mayHaveMore = activity.data?.length === RECENT_ENTRIES;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading id={headingId}>Recently</SectionHeading>
      <ActivityStates activity={activity} people={people} listLabel="Recently done" />
      {mayHaveMore ? (
        <LazySheet
          trigger={(triggerProps) => (
            <Button variant="secondary" {...triggerProps}>
              See all
            </Button>
          )}
          sheet={(opening) => (
            <AllActivitySheet {...opening} householdId={householdId} people={people} />
          )}
        />
      ) : null}
    </section>
  );
}
