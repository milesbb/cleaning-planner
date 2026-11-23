'use client';

import { MAX_ACTIVITY_ENTRIES } from '@cleaning-planner/contracts/activity';
import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import type { SheetOpening } from '@/lib/lazy-sheet';
import type { ActivityPeople } from './activity-line';
import { ActivityStates } from './activity-states';
import { useActivity } from './use-activity';

interface AllActivitySheetProps extends SheetOpening {
  householdId: string;
  people: ActivityPeople;
}

// Loaded on first use, so the longer list is only asked for once it opens.
export function AllActivitySheet({
  householdId,
  people,
  ...opening
}: AllActivitySheetProps): ReactNode {
  const activity = useActivity(householdId, MAX_ACTIVITY_ENTRIES);
  return (
    <BottomSheet title="Recently done" {...opening}>
      <ActivityStates activity={activity} people={people} listLabel="Everything recently done" />
    </BottomSheet>
  );
}
