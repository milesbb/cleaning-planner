'use client';

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import type { SheetTriggerProps } from '@/lib/lazy-sheet';
import { cn } from '@/lib/utils';

// Job detail's sheets, each loaded the first time its button is used, so the
// dialog, the choice controls and the forms aren't in the page's first load.

export const AssigneeSheet = lazy(async () => ({
  default: (await import('./assignee-sheet')).AssigneeSheet,
}));
export const DoneEarlierSheet = lazy(async () => ({
  default: (await import('./done-earlier-sheet')).DoneEarlierSheet,
}));
export const JobRoomSheet = lazy(async () => ({
  default: (await import('./job-time-room-sheets')).JobRoomSheet,
}));
export const JobTimeSheet = lazy(async () => ({
  default: (await import('./job-time-room-sheets')).JobTimeSheet,
}));
export const RemoveJobSheet = lazy(async () => ({
  default: (await import('./remove-job-sheet')).RemoveJobSheet,
}));
export const RenameJobSheet = lazy(async () => ({
  default: (await import('./rename-job-sheet')).RenameJobSheet,
}));
export const ScheduleSheet = lazy(async () => ({
  default: (await import('./schedule-sheet')).ScheduleSheet,
}));
export const SnoozeSheet = lazy(async () => ({
  default: (await import('./snooze-sheet')).SnoozeSheet,
}));

interface TextActionTriggerProps {
  label: string;
  triggerProps: SheetTriggerProps;
  className?: string;
  disabled?: boolean;
}

// The text-style button under a job fact that opens its sheet.
export function TextActionTrigger({
  label,
  triggerProps,
  className,
  disabled = false,
}: TextActionTriggerProps): ReactNode {
  return (
    <button
      type="button"
      className={cn(TEXT_ACTION_CLASSES, 'self-start', className)}
      disabled={disabled}
      {...triggerProps}
    >
      {label}
    </button>
  );
}
