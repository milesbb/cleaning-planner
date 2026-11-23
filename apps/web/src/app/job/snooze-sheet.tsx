'use client';

import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { formatDayHeading } from '@/lib/format-date';
import { snoozeChoices } from '@/lib/home/job-details';
import type { SheetOpening } from '@/lib/lazy-sheet';

interface SnoozeSheetProps extends SheetOpening {
  nextDue: CalendarDate;
  today: CalendarDate;
  onSnooze: (until: CalendarDate) => void;
}

// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function SnoozeSheet({
  nextDue,
  today,
  onSnooze,
  open,
  onOpenChange,
  returnFocusTo,
}: SnoozeSheetProps): ReactNode {
  return (
    <BottomSheet
      title="Snooze"
      description="Move this job to a later day. It goes back to its usual timing after that."
      open={open}
      onOpenChange={onOpenChange}
      returnFocusTo={returnFocusTo}
    >
      <ul aria-label="Snooze until" className="flex flex-col gap-3">
        {snoozeChoices(nextDue, today).map((choice) => (
          <li key={choice.until}>
            <Button
              variant="secondary"
              className="w-full flex-col gap-0"
              onClick={() => {
                onOpenChange(false);
                onSnooze(choice.until);
              }}
            >
              <span>{choice.label}</span>
              <span className="text-sm font-normal">{formatDayHeading(choice.until)}</span>
            </Button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
