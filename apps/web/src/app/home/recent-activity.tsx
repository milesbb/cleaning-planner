'use client';

import { MAX_ACTIVITY_ENTRIES } from '@cleaning-planner/contracts/activity';
import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import type { UseQueryResult } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/section-heading';
import { activityLine } from './activity-line';
import type { ActivityPeople } from './activity-line';
import { useActivity } from './use-activity';

const RECENT_ENTRIES = 10;

interface ActivityStatesProps {
  activity: UseQueryResult<ActivityEntry[]>;
  people: ActivityPeople;
  listLabel: string;
}

// Loading, failed, empty or the list, for both the section and the sheet.
function ActivityStates({ activity, people, listLabel }: ActivityStatesProps): ReactNode {
  if (activity.isPending) return <p role="status">Getting what’s been done…</p>;
  if (activity.isError) {
    return (
      <div className="flex flex-col gap-3">
        <p>{`Couldn’t get what’s been done. ${activity.error.message}`}</p>
        <Button variant="secondary" onClick={() => void activity.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (activity.data.length === 0) {
    return <p>Nothing yet. Jobs show up here once someone ticks them off.</p>;
  }
  return (
    <ul aria-label={listLabel} className="flex flex-col gap-2">
      {activity.data.map((entry) => (
        <li key={`${entry.doneAt}-${entry.jobId}`} className="text-[1.0625rem] break-words">
          {activityLine(entry, people)}
        </li>
      ))}
    </ul>
  );
}

interface RecentActivityProps {
  householdId: string;
  people: ActivityPeople;
}

// Asks for the longer list only once the sheet is opened.
function AllActivitySheet({ householdId, people }: RecentActivityProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const activity = useActivity(householdId, MAX_ACTIVITY_ENTRIES, isOpen);
  return (
    <BottomSheet
      title="Recently done"
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={<Button variant="secondary">See all</Button>}
    >
      <ActivityStates activity={activity} people={people} listLabel="Everything recently done" />
    </BottomSheet>
  );
}

export function RecentActivity({ householdId, people }: RecentActivityProps): ReactNode {
  const headingId = useId();
  const activity = useActivity(householdId, RECENT_ENTRIES);
  const mayHaveMore = activity.data?.length === RECENT_ENTRIES;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading id={headingId}>Recently</SectionHeading>
      <ActivityStates activity={activity} people={people} listLabel="Recently done" />
      {mayHaveMore ? <AllActivitySheet householdId={householdId} people={people} /> : null}
    </section>
  );
}
