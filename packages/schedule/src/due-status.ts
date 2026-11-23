import {
  addInterval,
  type CalendarDate,
  DAYS_PER_WEEK,
  WEEKDAYS_FROM_SUNDAY,
  weekdayNumberOf,
} from './calendar-date';
import type { Weekday } from './types';

export type DueStatus = 'late' | 'today' | 'tomorrow' | 'thisWeek' | 'later';

function daysSinceWeekStart(today: CalendarDate, weekStartsOn: Weekday): number {
  const weekStartNumber = WEEKDAYS_FROM_SUNDAY.indexOf(weekStartsOn);
  return (weekdayNumberOf(today) - weekStartNumber + DAYS_PER_WEEK) % DAYS_PER_WEEK;
}

export function firstDayOfWeek(today: CalendarDate, weekStartsOn: Weekday): CalendarDate {
  return addInterval(today, { value: -daysSinceWeekStart(today, weekStartsOn), unit: 'day' });
}

export function lastDayOfWeek(today: CalendarDate, weekStartsOn: Weekday): CalendarDate {
  const daysLeftInWeek = DAYS_PER_WEEK - 1 - daysSinceWeekStart(today, weekStartsOn);
  return addInterval(today, { value: daysLeftInWeek, unit: 'day' });
}

export function classifyDue(
  dueDate: CalendarDate,
  today: CalendarDate,
  weekStartsOn: Weekday,
): DueStatus {
  if (dueDate < today) return 'late';
  if (dueDate === today) return 'today';
  if (dueDate === addInterval(today, { value: 1, unit: 'day' })) return 'tomorrow';
  return dueDate <= lastDayOfWeek(today, weekStartsOn) ? 'thisWeek' : 'later';
}
