import { addInterval, type CalendarDate } from './calendar-date';
import type { FloatingSchedule } from './types';

export interface CompletionHistory {
  startDate: CalendarDate;
  lastDoneOn: CalendarDate | null;
}

export function nextDueDate(schedule: FloatingSchedule, history: CompletionHistory): CalendarDate {
  if (history.lastDoneOn === null) return history.startDate;
  return addInterval(history.lastDoneOn, schedule.every);
}
