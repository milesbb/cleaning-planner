'use client';

import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { activityLine } from './activity-line';
import type { ActivityPeople } from './activity-line';

export interface ActivityStatesProps {
  activity: UseQueryResult<ActivityEntry[]>;
  people: ActivityPeople;
  listLabel: string;
}

// Loading, failed, empty or the list, for both the section and the sheet.
export function ActivityStates({ activity, people, listLabel }: ActivityStatesProps): ReactNode {
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
