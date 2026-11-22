import type { CalendarDate } from './calendar-date';
import type { Snooze } from './types';

export interface SnoozeRequest {
  currentDueDate: CalendarDate;
  requestedDate: CalendarDate;
  today: CalendarDate;
}

export function createSnooze({ currentDueDate, requestedDate, today }: SnoozeRequest): Snooze {
  const isLaterThanDueDate = requestedDate > currentDueDate;
  const isLaterThanToday = requestedDate > today;
  if (!isLaterThanDueDate || !isLaterThanToday) {
    throw new Error('A snooze must move the job to a later day');
  }
  return { from: currentDueDate, until: requestedDate };
}
