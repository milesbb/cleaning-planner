import { addInterval, type CalendarDate } from './calendar-date';
import { firstFixedOccurrence } from './fixed-schedule';
import type { FixedSchedule, FloatingSchedule, Interval, Schedule, Snooze } from './types';

export interface CompletionHistory {
  startDate: CalendarDate;
  lastDoneOn: CalendarDate | null;
  snooze?: Snooze;
}

const ONE_DAY: Interval = { value: 1, unit: 'day' };

function nextFloatingDueDate(schedule: FloatingSchedule, history: CompletionHistory): CalendarDate {
  if (history.lastDoneOn === null) return history.startDate;
  return addInterval(history.lastDoneOn, schedule.every);
}

function nextFixedDueDate(schedule: FixedSchedule, history: CompletionHistory): CalendarDate {
  const searchFrom =
    history.lastDoneOn === null ? history.startDate : addInterval(history.lastDoneOn, ONE_DAY);
  return firstFixedOccurrence(schedule.on, searchFrom);
}

function scheduledDueDate(schedule: Schedule, history: CompletionHistory): CalendarDate {
  return schedule.type === 'floating'
    ? nextFloatingDueDate(schedule, history)
    : nextFixedDueDate(schedule, history);
}

export function nextDueDate(schedule: Schedule, history: CompletionHistory): CalendarDate {
  const dueDate = scheduledDueDate(schedule, history);
  const { snooze } = history;
  return snooze?.from === dueDate ? snooze.until : dueDate;
}
