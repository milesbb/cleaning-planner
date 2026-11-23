'use client';

import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { moveChoices } from './move-job';

export interface JobToMove {
  jobId: string;
  name: string;
  dueDate: CalendarDate;
}

interface MoveJobSheetProps {
  job: JobToMove | null;
  today: CalendarDate;
  lastDay: CalendarDate;
  onClose: () => void;
  onMove: (until: CalendarDate) => void;
}

export function MoveJobSheet({
  job,
  today,
  lastDay,
  onClose,
  onMove,
}: MoveJobSheetProps): ReactNode {
  const choices = job === null ? [] : moveChoices({ dueDate: job.dueDate, today, lastDay });
  return (
    <BottomSheet
      title={job === null ? 'Move to…' : `Move ${job.name} to…`}
      description="Pick a later day. It goes back to its usual timing after that."
      open={job !== null}
      onOpenChange={(isOpening) => {
        if (!isOpening) onClose();
      }}
    >
      {choices.length === 0 ? (
        <p>There’s no later day this week or next. Snooze it from the job itself.</p>
      ) : (
        <ul aria-label="Move to" className="flex flex-col gap-2">
          {choices.map((choice) => (
            <li key={choice.day}>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  onMove(choice.day);
                }}
              >
                {choice.label}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
