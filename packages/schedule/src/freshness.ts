import { addInterval, daysBetween } from './calendar-date';
import type { CalendarDate } from './calendar-date';
import { nextDueDate } from './next-due';
import type { CompletionHistory } from './next-due';
import type { FloatingSchedule, Schedule } from './types';

const FRESH = 1;
const DUE = 0;

// A job never done is treated as done one interval before its start date, so
// it runs down to its first due day like any other.
function measuredFrom(schedule: FloatingSchedule, history: CompletionHistory): CalendarDate {
  if (history.lastDoneOn !== null) return history.lastDoneOn;
  return addInterval(history.startDate, { ...schedule.every, value: -schedule.every.value });
}

// How fresh a repeat-after-done job is: 1 on the day it was done, falling
// evenly to 0 on the day it's due, and 0 from then on. Jobs on set days have
// no freshness (null).
export function freshness(
  schedule: Schedule,
  history: CompletionHistory,
  today: CalendarDate,
): number | null {
  if (schedule.type !== 'floating') return null;
  const dueDate = nextDueDate(schedule, history);
  const span = daysBetween(measuredFrom(schedule, history), dueDate);
  if (span <= 0) return DUE;
  const daysLeft = daysBetween(today, dueDate);
  return Math.min(FRESH, Math.max(DUE, daysLeft / span));
}
