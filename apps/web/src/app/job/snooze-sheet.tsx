'use client';

import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { formatDayHeading } from '@/lib/format-date';
import { snoozeChoices } from '@/lib/home/job-details';

interface SnoozeSheetProps {
  nextDue: CalendarDate;
  today: CalendarDate;
  isBusy: boolean;
  onSnooze: (until: CalendarDate) => void;
}

export function SnoozeSheet({ nextDue, today, isBusy, onSnooze }: SnoozeSheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <BottomSheet
      title="Snooze"
      description="Move this job to a later day. It goes back to its usual timing after that."
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Button variant="secondary" disabled={isBusy}>
          Snooze
        </Button>
      }
    >
      <ul aria-label="Snooze until" className="flex flex-col gap-3">
        {snoozeChoices(nextDue, today).map((choice) => (
          <li key={choice.until}>
            <Button
              variant="secondary"
              className="w-full flex-col gap-0"
              onClick={() => {
                setIsOpen(false);
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
