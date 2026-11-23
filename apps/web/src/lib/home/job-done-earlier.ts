import {
  addInterval,
  compareDates,
  isCalendarDate,
} from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { formatShortDate } from '../format-date';

// "Done on another day": any day before today, but never before the job was
// last done, so the history stays in order.

export interface EarlierDayRange {
  earliest: CalendarDate | null;
  latest: CalendarDate;
}

export interface EarlierDayChoice {
  label: string;
  day: CalendarDate;
}

const QUICK_CHOICES = [
  { label: 'Yesterday', daysAgo: 1 },
  { label: '2 days ago', daysAgo: 2 },
] as const;

const CALENDAR_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

function daysBefore(date: CalendarDate, days: number): CalendarDate {
  return addInterval(date, { value: -days, unit: 'day' });
}

function isInRange(day: CalendarDate, { earliest, latest }: EarlierDayRange): boolean {
  const isAfterEarliest = earliest === null || compareDates(day, earliest) >= 0;
  return isAfterEarliest && compareDates(day, latest) <= 0;
}

// Null when there is no earlier day left: it was already done today.
export function earlierDayRange(
  today: CalendarDate,
  lastDoneOn: CalendarDate | null,
): EarlierDayRange | null {
  const latest = daysBefore(today, 1);
  if (lastDoneOn !== null && compareDates(lastDoneOn, latest) > 0) return null;
  return { earliest: lastDoneOn, latest };
}

export function earlierDayChoices(today: CalendarDate, range: EarlierDayRange): EarlierDayChoice[] {
  return QUICK_CHOICES.map(({ label, daysAgo }) => ({
    label,
    day: daysBefore(today, daysAgo),
  })).filter((choice) => isInRange(choice.day, range));
}

export type CheckedEarlierDay = { day: CalendarDate } | { error: string };

export function checkEarlierDay(typed: string, range: EarlierDayRange): CheckedEarlierDay {
  if (!CALENDAR_DATE_SHAPE.test(typed) || !isCalendarDate(typed)) {
    return { error: 'Pick the day it was done' };
  }
  if (compareDates(typed, range.latest) > 0) {
    return { error: 'Pick a day before today, or use Mark as done' };
  }
  if (range.earliest !== null && compareDates(typed, range.earliest) < 0) {
    return {
      error: `It was last done on ${formatShortDate(range.earliest)}. Pick that day or later.`,
    };
  }
  return { day: typed };
}
