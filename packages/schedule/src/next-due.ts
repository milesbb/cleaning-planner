import { addInterval, type CalendarDate } from './calendar-date';
import { firstFixedOccurrence } from './fixed-schedule';
import type { FixedSchedule, FloatingSchedule, Interval, Schedule } from './types';

export interface CompletionHistory {
  startDate: CalendarDate;
  lastDoneOn: CalendarDate | null;
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

export function nextDueDate(schedule: Schedule, history: CompletionHistory): CalendarDate {
  return schedule.type === 'floating'
    ? nextFloatingDueDate(schedule, history)
    : nextFixedDueDate(schedule, history);
}
